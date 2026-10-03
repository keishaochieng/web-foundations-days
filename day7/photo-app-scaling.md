# SnapShare Scaling Plan

## 1. Assumptions
- 10 million registered users; 10% are active each day.
- Each active user uploads 1 photo and views 50 feed pages per day.
- Photo: 2 MB original + 50 KB thumbnail. One day = 86,400 seconds. Peak = 5x average.
- **Daily active users:** 10,000,000 x 10% = **1,000,000**.

## 2. Estimates
- **Uploads:** 1,000,000 per day / 86,400 = **11.6 per second** average, **58 per second** peak.
- **Feed views:** 1,000,000 x 50 = 50,000,000 per day / 86,400 = **579 per second** average, **2,900 per second** peak.
- **Storage per year:** (2 MB + 0.05 MB) x 1,000,000 = 2.05 TB per day; x 365 = **about 748 TB**.

## 3. Read-heavy or write-heavy?
**Read-heavy.** There are about 50 feed views for every upload. So reads must be fast and cheap (CDN, cache, read replica), while writes can go to one primary database and slow work can run in the background.

## 4. Where photos are stored
Photos do not belong in the database: files this large would make it huge, slow and costly to back up. They go in **object storage**, which is cheap and built for large files. The database keeps only the metadata and the file's storage key, and the CDN serves the files.

## 5. Architecture diagram

```text
Users
 |-- photos --> CDN --(cache miss)--> Object storage
 |
 +-- requests --> Load balancer --> App servers
                                     |-- Cache
                                     |-- Database (primary) --> Read replica
                                     |-- Object storage (originals)
                                     +-- Queue --> Worker --> Object storage (thumbnails)
```

## 6. Components
- **CDN:** serves photos from servers near the user, so images load fast and our servers see less traffic.
- **Load balancer:** spreads requests across app servers so none is overloaded.
- **App servers:** run the app logic and can be added as traffic grows.
- **Cache:** keeps popular data such as feeds in memory so the database is asked less often.
- **Database (primary):** stores users, follows and photo metadata, and handles all writes.
- **Read replica:** a copy of the database that answers reads and takes load off the primary.
- **Object storage:** stores the photo files cheaply and reliably at huge scale.
- **Queue:** holds thumbnail jobs so uploads finish quickly.
- **Worker:** takes jobs from the queue and creates thumbnails in the background.

## 7. Upload flow
1. The user sends a photo and the load balancer passes the request to an app server.
2. The app server checks the login, file type and size.
3. It saves the original in object storage and gets a storage key.
4. It saves a photo row in the primary database with thumbnail status "pending".
5. It puts a "create thumbnail" job on the queue.
6. It tells the user the upload succeeded, without waiting for the thumbnail.
7. A worker takes the job, downloads the original and creates a 50 KB thumbnail.
8. The worker saves the thumbnail in object storage and marks the row "ready".
9. Followers' feeds then load the photo and thumbnail through the CDN.

## 8. Trade-offs
- **Cache speed vs fresh data:** cached feeds are fast but can be slightly out of date, so a new photo may appear late.
- **Read replica vs consistency:** replicas spread reads, but replication lag means a user may not see a new photo straight away; own recent data can be read from the primary.
- **Queue vs instant thumbnails:** background thumbnails make uploads fast, but the thumbnail appears a moment later, so a placeholder is needed.
- **CDN speed vs cost:** a CDN loads images quickly but adds a monthly cost, and changed photos can show old versions until the cache expires.