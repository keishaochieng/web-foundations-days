# SnapShare Scaling Plan

SnapShare is a photo-sharing app where users upload photos and scroll a feed of photos from people they follow.

## 1. Assumptions

- 10 million registered users.
- 10% of them are active each day.
- Each active user uploads 1 photo per day.
- Each active user views 50 feed pages per day (one feed page view is one request to the feed).
- An average photo is 2 MB, and each photo also gets a 50 KB thumbnail.
- One day has 86,400 seconds.
- Peak traffic is 5 times the average.

**Daily active users (DAU):** 10,000,000 x 10% = **1,000,000 users per day**.

## 2. Estimates

### Uploads per second
- Uploads per day: 1,000,000 users x 1 photo = 1,000,000 photos.
- Average: 1,000,000 / 86,400 = about **11.6 uploads per second**.
- Peak (5x): about **58 uploads per second**.
- Peak upload bandwidth: 58 x 2 MB = about 116 MB per second.

### Feed views per second
- Feed views per day: 1,000,000 users x 50 pages = 50,000,000 views.
- Average: 50,000,000 / 86,400 = about **579 views per second**.
- Peak (5x): about **2,900 views per second**.

### Photo storage per year
- Storage per photo: 2 MB original + 0.05 MB thumbnail = 2.05 MB.
- Per day: 1,000,000 x 2.05 MB = 2,050,000 MB = about 2.05 TB.
- Per year: 2.05 TB x 365 = about **748 TB** (roughly 0.75 PB).
- Of that, originals are about 730 TB and thumbnails about 18 TB.

| Measure | Average | Peak (5x) |
|---|---|---|
| Uploads per second | 11.6 | 58 |
| Feed views per second | 579 | 2,900 |
| Storage per year | 748 TB | - |

## 3. Read-heavy or write-heavy?

SnapShare is **read-heavy**. There are 50 million feed views for every 1 million uploads each day, a ratio of about 50 reads to 1 write.

What this means for the design:
- Make reads fast and cheap: use a CDN for photos, a cache for feeds and hot data, and a read replica of the database.
- Writes are fewer, so a single primary database can handle them, and slow work such as thumbnails can be done in the background.
- Scale the read side first, by adding cache capacity and replicas.

## 4. Why photos are not stored in the database

- A database is built for small structured rows. Storing 748 TB of photo files each year would make it huge, slow and very expensive to back up and replicate.
- Large files in the database slow down the queries for ordinary data such as users, follows and captions.
- Photos should go in **object storage** (such as Amazon S3). It is cheap, built for large files and scales almost without limit. The database stores only the photo's metadata and its storage key (the file's address), and the CDN serves the file to users.

## 5. Architecture diagram

```text
                    Users (mobile app / web)
                       |                |
              (view photos)         (API requests)
                       v                v
                  +---------+     +---------------+
                  |   CDN   |     | Load balancer |
                  +---------+     +---------------+
                       |                  |
              (cache miss)       +--------+--------+
                       |         v        v        v
                       |      +-----+  +-----+  +-----+
                       |      | App |  | App |  | App |
                       |      | srv |  | srv |  | srv |
                       |      +-----+  +-----+  +-----+
                       |         |  \       |        \
                       |         |   \      |         \
                       |         v    v     v          v
                       |    +-------+  +----------+  +-------+
                       |    | Cache |  | Database |  | Queue |
                       |    +-------+  | (primary)|  +-------+
                       |               +----------+      |
                       |                    |            v
                       |             replication   +-----------+
                       |                    v       | Thumbnail |
                       |             +-----------+  |  worker   |
                       |             |   Read    |  +-----------+
                       |             |  replica  |        |
                       |             +-----------+        |
                       v                                  v
                  +-----------------------------------------+
                  |             Object storage              |
                  |  (original photos and 50 KB thumbnails) |
                  +-----------------------------------------+

App servers also save uploaded originals to object storage.
```

## 6. What each component does

- **CDN:** serves photos and thumbnails from servers close to the user, so images load fast and most photo traffic never reaches our own servers.
- **Load balancer:** spreads incoming requests across the app servers so no single server is overloaded, and it keeps the app running if one server fails.
- **App servers:** run the application logic (login, upload, feed) and can be added or removed as traffic grows.
- **Cache:** keeps frequently requested data such as feeds in fast memory, so the database is not asked the same question again and again.
- **Database (primary):** stores the structured data (users, follows, photo metadata, likes) and handles all writes.
- **Read replica:** a copy of the database that answers read queries, which takes load off the primary.
- **Object storage:** stores the photo files cheaply and reliably at huge scale, so the database doesn't have to.
- **Queue:** holds thumbnail jobs so the upload can finish quickly while the slow work waits to be processed.
- **Worker:** takes jobs from the queue, creates the thumbnail and saves it, without making the user wait.

## 7. Upload flow

1. The user picks a photo and the app sends an upload request.
2. The load balancer sends the request to one of the app servers.
3. The app server checks that the user is logged in and that the file is a valid image within the size limit.
4. The app server saves the original photo in object storage and gets back its storage key.
5. The app server saves a new photo row in the primary database (photo id, owner, storage key, caption, time, thumbnail status "pending").
6. The app server puts a "create thumbnail" job (photo id and storage key) on the queue.
7. The app server replies "upload successful" to the user, so the user doesn't wait for the thumbnail.
8. A worker takes the job from the queue, downloads the original, creates a 50 KB thumbnail and saves it to object storage.
9. The worker updates the database row to show the thumbnail is ready, and the relevant cache entries are refreshed.
10. When followers open their feeds, the thumbnail and photo are served through the CDN.

## 8. Trade-offs

- **Cache speed vs fresh data:** a cached feed is fast and protects the database, but it may be a few seconds or minutes out of date, so a new photo can appear a little late. A shorter cache time gives fresher feeds but more load on the database.
- **Read replica vs consistency:** replicas spread the read load, but there is a small delay before they receive new data (replication lag). A user might not see their own new photo straight away, so a user's own recent data can be read from the primary.
- **Queue and worker vs instant thumbnails:** doing thumbnails in the background makes uploads fast and handles traffic spikes, but the thumbnail appears a moment after the upload, so the app needs a placeholder image. It also adds more parts to run and monitor.
- **CDN speed vs cost:** a CDN makes images load quickly worldwide, but it adds a monthly cost, and a changed or deleted photo can keep showing from the CDN cache until it expires.