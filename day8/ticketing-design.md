# TicketHub Design

TicketHub is a website that sells tickets for concerts and events.

## 1. Requirements

**Functional**
- Register and log in.
- Browse events and see event details.
- View a seat map showing which seats are free.
- Hold seats for 10 minutes while the user pays.
- Pay for held seats and receive tickets.
- View "my tickets".

**Non-functional**
- **Correctness:** a seat must never be sold to two people. This is the most important rule.
- **Speed:** pages load in under 300 ms, and a seat hold answers in under 1 second, even during a big sale.
- **Availability:** the site stays up when a popular concert goes on sale.
- **Fairness:** first come, first served, with no jumping the line.
- **Durability and security:** paid orders are never lost; payments go through a payment provider over HTTPS; passwords are hashed.

## 2. Estimates

**Normal day**
- Page views: 50,000 visitors x 10 pages = 500,000 per day / 86,400 = about **5.8 per second** (peak at 5x: about 29 per second).
- Tickets: 5,000 per day = about **0.06 per second** (one every 17 seconds).

**Big sale (200,000 people, 20,000 seats, 10 minutes = 600 seconds)**
- Arrivals: 200,000 / 600 = about **333 people per second**.
- Assuming about 10 requests per person (seat map, hold, pay): 2,000,000 / 600 = about **3,300 requests per second**.
- Seat holds: about 333 attempts per second, but only 20,000 can succeed. Purchases: at most 20,000 / 600 = about **33 per second**.

| | Normal | Big sale |
|---|---|---|
| Requests per second | 5.8 (peak 29) | about 3,300 |
| Purchases per second | 0.06 | up to 33 |

The big sale is about **575 times** the normal average load and about 115 times the normal peak. Normally the site is read-heavy, but in the sale thousands of people write to the same rows, so the design must be built for the sale.

## 3. API

All paths start with `/api/v1`. Requests and responses use JSON.

| Method | Path | Description | Success |
|---|---|---|---|
| POST | `/auth/login` | Log in and get a token | 200 |
| GET | `/events` | List upcoming events | 200 |
| GET | `/events/{id}` | Get one event | 200 |
| GET | `/events/{id}/seats` | View the seat map and availability | 200 |
| POST | `/events/{id}/holds` | Hold seats for 10 minutes | 201 |
| DELETE | `/holds/{holdId}` | Release a hold | 204 |
| POST | `/orders` | Pay for a hold and create an order | 201 |
| GET | `/me/tickets` | View my tickets | 200 |

Example hold: `POST /events/7/holds` with `{ "seatIds": [101, 102] }` returns `201` with `{ "holdId": 55, "expiresAt": "2026-10-10T19:10:00Z" }`.

Errors: **400** invalid request (no seats chosen); **401** not logged in; **404** event or hold not found; **409 Conflict** a seat was just taken by someone else; **429** too many requests (waiting room).

## 4. Data model

- **users**(user_id PK, name, email UNIQUE, password_hash, created_at)
- **events**(event_id PK, name, venue, event_date, on_sale_at)
- **seats**(seat_id PK, event_id FK, section, row_label, seat_number, price, status, held_by FK to users, hold_expires_at; UNIQUE on event_id + section + row_label + seat_number). The status is `available`, `held` or `sold`.
- **orders**(order_id PK, user_id FK, total_amount, payment_ref, status, created_at)
- **tickets**(ticket_id PK, order_id FK, seat_id FK **UNIQUE**)

**Relationships:** one user has many orders; one event has many seats; one order has many tickets; each ticket is for exactly one seat. Because `seat_id` is unique in `tickets`, a seat can have only one ticket.

## 5. Preventing two people buying the same seat

1. **Atomic hold.** A seat is claimed with one conditional update. The database locks the row while it runs, so of two simultaneous requests only one can succeed:

```sql
UPDATE seats
SET status = 'held', held_by = :user, hold_expires_at = :now_plus_10_min
WHERE seat_id = :seat
  AND (status = 'available' OR (status = 'held' AND hold_expires_at < :now));
```

If it changes 0 rows, the seat is already taken and the API returns `409`.

2. **Transaction.** Holding several seats, or paying, runs inside one transaction (`BEGIN ... COMMIT`). If any seat fails, everything is rolled back.
3. **Payment step.** In one transaction we check the hold is still the user's and not expired, create the order, insert the tickets and mark the seats `sold`.
4. **Constraint as a backstop.** `UNIQUE (seat_id)` on `tickets` makes the database reject a second ticket for a seat, even if the application has a bug.
5. **Expiry.** Holds last 10 minutes, and a worker also releases expired ones.
6. **The cache is never trusted.** It only draws the seat map, and the database makes the final decision.

## 6. Architecture

```text
Users --> DNS --> CDN --> Waiting room --> Load balancer
                                               |
                               App servers (auto-scaled, many)
                    +-----------+-----------+------------+
                    v           v           v            v
                  Cache    Primary DB     Queue     Payment provider
              (seat maps) (holds, orders)   |         (external)
                               |            v
                          replication    Workers
                               v   (emails, release expired holds)
                          Read replica
                      (browsing events)
```

- **DNS:** turns the site name into the address of our service.
- **CDN:** serves images and static files from nearby, so the big sale doesn't hit our servers for them.
- **Waiting room:** lets people into the sale at a controlled rate instead of 200,000 at once, which also keeps it fair.
- **Load balancer:** spreads requests over the app servers and avoids failed ones.
- **App servers:** run the API and are added automatically before a big sale.
- **Cache:** serves the seat map and availability so most views never reach the database.
- **Primary database:** the single source of truth for holds and orders, and the place where double booking is prevented.
- **Read replica:** answers event browsing queries and takes load off the primary.
- **Queue and workers:** do slow jobs (confirmation emails, releasing expired holds) in the background.
- **Payment provider:** handles card payments, so we never store card details.

**Surviving the big sale:** the waiting room limits the arrival rate; the CDN and cache take the read load; app servers scale up in advance; losers get a fast `409` and don't wait; and the primary database only handles the hold and order writes, at most about 33 purchases per second, which one good database can handle.

## 7. Trade-offs

- **Waiting room: fairness and stability vs convenience.** Users may wait in a line, but the site stays up and is fair. Without it, everyone rushes at once and the site could crash.
- **Cache: speed vs freshness.** The seat map may show a seat as free a second after it was taken, so a user may get a `409` and must pick another. We accept this because the database makes the final decision.
- **Hold time: 10 minutes.** Long holds block seats others want; short holds frustrate people who are still paying. Ten minutes plus automatic expiry is the balance.
- **SQL transactions: correctness vs raw scale.** A relational database limits write speed, but 33 purchases per second is well within its capacity, and correctness matters more than flexibility here.