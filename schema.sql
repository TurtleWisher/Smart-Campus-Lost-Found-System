SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET FOREIGN_KEY_CHECKS=0;

CREATE TABLE IF NOT EXISTS `categories` (
  `category_id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL,
  `description` text DEFAULT NULL,
  PRIMARY KEY (`category_id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4;

INSERT INTO `categories` VALUES
(1,'Electronics','Phones, laptops, chargers, earbuds, tablets'),
(2,'ID Cards','Student or staff ID cards and access cards'),
(3,'Textbooks','Books, notebooks and academic materials'),
(4,'Bags','Backpacks, handbags and pouches'),
(5,'Keys','House keys, car keys and locker keys'),
(6,'Clothing','Jackets, scarves, caps and accessories'),
(7,'Stationery','Pens, pencils, calculators and art supplies'),
(8,'Wallet','Wallets, purses and cardholders'),
(9,'Water Bottle','Bottles, flasks and tumblers'),
(10,'Others','Anything that does not fit above categories');

CREATE TABLE IF NOT EXISTS `locations` (
  `location_id` int(11) NOT NULL AUTO_INCREMENT,
  `floor_no` int(11) DEFAULT NULL,
  `zone` varchar(5) DEFAULT NULL,
  `room_no` varchar(20) DEFAULT NULL,
  `misc_location` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`location_id`)
) ENGINE=InnoDB AUTO_INCREMENT=20 DEFAULT CHARSET=utf8mb4;

INSERT INTO `locations` VALUES
(1,1,NULL,NULL,'Main Entrance'),
(2,1,NULL,NULL,'Ground Floor Cafeteria'),
(3,1,NULL,NULL,'Security Desk'),
(4,2,'A',NULL,NULL),(5,2,'B',NULL,NULL),
(6,3,'A',NULL,NULL),(7,3,'B',NULL,NULL),
(8,4,'A','401',NULL),(9,4,'B','412',NULL),
(10,5,'C',NULL,NULL),(11,6,'D',NULL,NULL),
(12,7,'E',NULL,NULL),(13,8,'F',NULL,NULL),
(14,9,'G',NULL,NULL),(15,10,'H',NULL,NULL),
(16,11,NULL,NULL,'Prayer Room Male'),
(17,11,NULL,NULL,'Prayer Room Female'),
(18,12,NULL,NULL,'Faculty Offices'),
(19,13,NULL,NULL,'Rooftop');

CREATE TABLE IF NOT EXISTS `users` (
  `user_id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) DEFAULT NULL,
  `student_id` int(20) DEFAULT NULL,
  `gsuite` varchar(100) DEFAULT NULL,
  `password` varchar(255) DEFAULT NULL,
  `role` enum('general_user','admin') DEFAULT 'general_user',
  `user_type` enum('student','staff','faculty') DEFAULT NULL,
  `type_specific_id` varchar(20) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `gsuite` (`gsuite`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4;

INSERT INTO `users` VALUES
(1,'Samiul',22101421,'samiul@bracu.ac.bd','12345','general_user',NULL,NULL,'2026-04-21 17:34:40'),
(2,'Samiul',22101234,'samiul@g.bracu.ac.bd','$2b$10$L.1uV3BXHqd.Ob.PJ7fzd.G2545wjXWFrc/Xn3u1zhRVXVkH9GvOK','general_user',NULL,NULL,'2026-04-22 12:02:58'),
(3,'Sakib',NULL,'sakib@bracu.ac.bd','$2b$10$ReZcJio1Zm2jqgKm1d3asOSZ1AdABvMxnvhI.bpKCshw6YE657Rk2','general_user',NULL,NULL,'2026-04-23 06:49:44'),
(4,'Shishir',NULL,'shishir@bracu.ac.bd','$2b$10$Z1qGN4UcySPJM5DOsbFAwOdhQyVCs383cLMl/tlrjqOALxxV4o.Gy','general_user',NULL,NULL,'2026-04-23 08:32:59'),
(5,'Anupom',NULL,'anupom@bracu.ac.bd','$2b$10$NQ1f/yspQgauTucQ1T2bzOYaNn45x4MmKGVeR9ubw5vY8CX1nzSr2','general_user',NULL,NULL,'2026-04-23 12:38:54'),
(6,'Abir',NULL,'a@bracu.ac.bd','$2b$10$YaeBWIm4m2I6CpDyItfjSeKlrJNn1PQB8WzdrO3gwVnJsq6VpTizq','general_user',NULL,NULL,'2026-04-30 09:11:57'),
(7,'Samiul Sakib Admin',NULL,'samiuladmin@g.bracu.ac.bd','$2b$10$SPMXW0Nfgmax8LmTQLSKuORkt3KyYiVyD7YJAwZyDQSAa5T7KcPWG','admin',NULL,NULL,'2026-05-06 16:29:17'),
(8,'Samiul User',NULL,'samiuluser@g.bracu.ac.bd','$2b$10$MCSQB6ipjgSFcT3j..Ls2uPtXFN6REQTM2A65NoGeFjP1rwG1LBMe','general_user',NULL,NULL,'2026-05-06 19:55:11'),
(9,'Shah Rukh Khan',NULL,'srk@bracu.ac.bd','$2b$10$NKJD1Q/96xZLSmO40PwO5.4hKP8tiNjcqIziAlftgas4ubhUPwa7e','general_user',NULL,NULL,'2026-05-06 20:48:58'),
(10,'Shishir',NULL,'shishir@g.bracu.ac.bd','$2b$10$Vy/oJ8ZDAeYfieStXTrqVOlZOO.55JLq5drSUGoUVD00x3pDzAdB2','general_user',NULL,NULL,'2026-05-07 08:36:12'),
(11,'fahad',NULL,'fahad@g.bracu.ac.bd','$2b$10$J6.Z84p/2JYp3gsKSWkpR.uVD08LESvI86eKQLZGaCOKSfEOTt5l6','general_user',NULL,NULL,'2026-05-07 08:42:28'),
(12,'Samiul Real',NULL,'md.samiul.islam3@g.bracu.ac.bd','$2b$10$9ON9d8LvSnqhRH81la.WfOpUGvM8Y.b.Uo7o0IsmluGX2G6ammgk.','general_user','student','24141260','2026-06-19 14:36:37'),
(13,'Ahasan Habib',NULL,'ahasan.habib@g.bracu.ac.bd','$2b$10$tsc6vy6jvsCkTz1NJLcq6.G8YMLdcxzqfr2ZiNyW9d2MRYRH1TdIq','general_user','student','22222222','2026-06-19 14:38:25');

CREATE TABLE IF NOT EXISTS `found_items` (
  `found_id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `category_id` int(11) NOT NULL,
  `location_id` int(11) NOT NULL,
  `title` varchar(150) NOT NULL,
  `description` text DEFAULT NULL,
  `date_found` date NOT NULL,
  `date_reported` timestamp NOT NULL DEFAULT current_timestamp(),
  `status` enum('Found','Pending','Returned') DEFAULT 'Found',
  PRIMARY KEY (`found_id`),
  KEY `user_id` (`user_id`),
  KEY `category_id` (`category_id`),
  KEY `location_id` (`location_id`),
  CONSTRAINT `found_items_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `found_items_ibfk_2` FOREIGN KEY (`category_id`) REFERENCES `categories` (`category_id`),
  CONSTRAINT `found_items_ibfk_3` FOREIGN KEY (`location_id`) REFERENCES `locations` (`location_id`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4;

INSERT INTO `found_items` VALUES
(1,2,1,5,'Black Samsung Phone','Found a black Samsung phone near 2nd floor corridor','2024-04-20','2026-04-22 22:05:27','Pending'),
(3,8,10,1,'CGPA','haha','2026-05-07','2026-05-06 20:08:54','Returned'),
(4,9,8,5,'Money','500 Million','2026-05-07','2026-05-06 20:52:11','Found'),
(5,11,1,5,'Mouse','pc component','2026-05-07','2026-05-07 08:43:10','Pending'),
(6,7,1,16,'USB cable','Apple item','2026-06-19','2026-06-18 19:10:12','Returned'),
(7,7,6,16,'Bracelet','Sallu Bhai Style','2026-06-19','2026-06-18 19:53:11','Pending'),
(8,8,7,16,'Diary','ds','2026-06-19','2026-06-18 19:58:46','Pending'),
(9,8,1,10,'Video camera','deds','2026-06-13','2026-06-18 19:59:07','Returned'),
(11,8,1,8,'Power Bank','20000Hz','2026-06-06','2026-06-19 14:18:02','Found'),
(12,8,6,16,'Cap','Denim','2026-06-19','2026-06-19 14:20:17','Found'),
(13,13,1,17,'Camera','Nikon','2026-06-25','2026-06-19 14:38:54','Found');

CREATE TABLE IF NOT EXISTS `lost_items` (
  `lost_id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `category_id` int(11) NOT NULL,
  `location_id` int(11) NOT NULL,
  `title` varchar(150) NOT NULL,
  `description` text DEFAULT NULL,
  `date_lost` date NOT NULL,
  `date_reported` timestamp NOT NULL DEFAULT current_timestamp(),
  `status` enum('Lost','Pending','Claimed','Returned') DEFAULT 'Lost',
  PRIMARY KEY (`lost_id`),
  KEY `user_id` (`user_id`),
  KEY `category_id` (`category_id`),
  KEY `location_id` (`location_id`),
  CONSTRAINT `lost_items_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `lost_items_ibfk_2` FOREIGN KEY (`category_id`) REFERENCES `categories` (`category_id`),
  CONSTRAINT `lost_items_ibfk_3` FOREIGN KEY (`location_id`) REFERENCES `locations` (`location_id`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4;

INSERT INTO `lost_items` VALUES
(1,2,1,5,'Black Samsung Phone','Lost my black Samsung Galaxy S21 near the 6th floor cafeteria','2024-04-20','2026-04-22 21:48:47','Returned'),
(2,5,8,11,'money bag','black color premium','2026-04-26','2026-04-23 12:40:23','Lost'),
(3,6,1,2,'Laptop','dsdsds','2026-04-30','2026-04-30 09:13:13','Returned'),
(4,7,10,1,'Self Respect','sad','2026-05-06','2026-05-06 16:34:06','Lost'),
(5,9,3,14,'Book','gjgj','2026-05-07','2026-05-06 23:53:51','Lost'),
(6,9,1,19,'Samsung phone','black maybe','2026-05-07','2026-05-06 23:55:24','Returned'),
(7,9,1,5,'Calculator Casio','991 ex','2026-06-04','2026-06-18 20:03:25','Returned'),
(8,9,10,7,'Cricket bat','dsdsf','2026-07-08','2026-06-18 20:42:00','Lost'),
(9,9,1,8,'Power Bank','20000Hz','2026-06-05','2026-06-19 14:14:38','Lost'),
(10,9,6,16,'Cap','Denim','2026-06-19','2026-06-19 14:19:47','Lost'),
(11,12,1,17,'Camera','Nikon','2026-06-25','2026-06-19 14:37:14','Lost');

CREATE TABLE IF NOT EXISTS `claims` (
  `claim_id` int(11) NOT NULL AUTO_INCREMENT,
  `claimant_id` int(11) NOT NULL,
  `found_id` int(11) NOT NULL,
  `claim_date` timestamp NOT NULL DEFAULT current_timestamp(),
  `status` enum('Pending','Approved','Rejected') DEFAULT 'Pending',
  `reviewer_id` int(11) DEFAULT NULL,
  `review_date` timestamp NULL DEFAULT NULL,
  `review_notes` text DEFAULT NULL,
  PRIMARY KEY (`claim_id`),
  KEY `claimant_id` (`claimant_id`),
  KEY `found_id` (`found_id`),
  KEY `reviewer_id` (`reviewer_id`),
  CONSTRAINT `claims_ibfk_1` FOREIGN KEY (`claimant_id`) REFERENCES `users` (`user_id`),
  CONSTRAINT `claims_ibfk_2` FOREIGN KEY (`found_id`) REFERENCES `found_items` (`found_id`) ON DELETE CASCADE,
  CONSTRAINT `claims_ibfk_3` FOREIGN KEY (`reviewer_id`) REFERENCES `users` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4;

INSERT INTO `claims` VALUES
(2,8,1,'2026-05-06 19:57:12','Pending',NULL,NULL,NULL),
(3,9,6,'2026-06-18 19:11:24','Approved',7,'2026-06-18 20:31:06',NULL),
(4,9,3,'2026-06-18 19:13:31','Approved',7,'2026-06-18 20:25:52',NULL),
(5,9,5,'2026-06-18 19:22:30','Rejected',7,'2026-06-18 20:05:33','Wrong image'),
(6,9,7,'2026-06-18 19:53:43','Rejected',7,'2026-06-18 20:05:08','Wrong Info'),
(7,9,8,'2026-06-18 19:59:41','Pending',NULL,NULL,NULL),
(8,9,9,'2026-06-18 20:02:05','Approved',7,'2026-06-18 20:04:38',NULL);

CREATE TABLE IF NOT EXISTS `match_suggestions` (
  `match_id` int(11) NOT NULL AUTO_INCREMENT,
  `lost_id` int(11) NOT NULL,
  `found_id` int(11) NOT NULL,
  `match_score` decimal(5,2) DEFAULT NULL,
  `status` enum('Suggested','Confirmed','Rejected') DEFAULT 'Suggested',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`match_id`),
  KEY `lost_id` (`lost_id`),
  KEY `found_id` (`found_id`),
  CONSTRAINT `match_suggestions_ibfk_1` FOREIGN KEY (`lost_id`) REFERENCES `lost_items` (`lost_id`) ON DELETE CASCADE,
  CONSTRAINT `match_suggestions_ibfk_2` FOREIGN KEY (`found_id`) REFERENCES `found_items` (`found_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=30 DEFAULT CHARSET=utf8mb4;

INSERT INTO `match_suggestions` VALUES
(1,1,1,94.00,'Suggested','2026-05-06 23:51:53'),
(2,2,4,50.00,'Suggested','2026-05-06 23:51:53'),
(3,3,1,40.00,'Suggested','2026-05-06 23:51:53'),
(4,4,3,40.00,'Suggested','2026-05-06 23:51:53'),
(5,6,1,55.00,'Confirmed','2026-05-06 23:55:24'),
(6,1,5,70.00,'Suggested','2026-05-07 08:43:10'),
(7,3,5,40.00,'Suggested','2026-05-07 08:43:10'),
(8,6,5,40.00,'Suggested','2026-05-07 08:43:10'),
(9,1,6,40.00,'Suggested','2026-06-18 19:10:12'),
(10,3,6,40.00,'Suggested','2026-06-18 19:10:12'),
(11,6,6,40.00,'Suggested','2026-06-18 19:10:12'),
(12,1,9,40.00,'Suggested','2026-06-18 19:59:07'),
(13,3,9,40.00,'Suggested','2026-06-18 19:59:07'),
(14,6,9,40.00,'Suggested','2026-06-18 19:59:07'),
(15,7,1,70.00,'Suggested','2026-06-18 20:03:25'),
(16,7,5,70.00,'Suggested','2026-06-18 20:03:25'),
(17,7,6,40.00,'Suggested','2026-06-18 20:03:25'),
(18,7,9,40.00,'Suggested','2026-06-18 20:03:25'),
(19,9,1,40.00,'Suggested','2026-06-19 14:14:38'),
(20,9,5,40.00,'Suggested','2026-06-19 14:14:38'),
(22,9,11,100.00,'Suggested','2026-06-19 14:18:02'),
(23,10,7,70.00,'Suggested','2026-06-19 14:19:47'),
(24,10,12,100.00,'Suggested','2026-06-19 14:20:17'),
(25,11,1,40.00,'Suggested','2026-06-19 14:37:14'),
(26,11,5,40.00,'Suggested','2026-06-19 14:37:14'),
(27,11,11,40.00,'Suggested','2026-06-19 14:37:14'),
(28,9,13,40.00,'Suggested','2026-06-19 14:38:54'),
(29,11,13,100.00,'Suggested','2026-06-19 14:38:54');

CREATE TABLE IF NOT EXISTS `notifications` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `message` text NOT NULL,
  `item_id` int(11) DEFAULT NULL,
  `is_read` tinyint(4) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `notifications_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `proof_media` (
  `media_id` int(11) NOT NULL AUTO_INCREMENT,
  `claim_id` int(11) NOT NULL,
  `file_url` varchar(255) NOT NULL,
  `media_type` enum('image','video','document') NOT NULL,
  `uploaded_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`media_id`),
  KEY `claim_id` (`claim_id`),
  CONSTRAINT `proof_media_ibfk_1` FOREIGN KEY (`claim_id`) REFERENCES `claims` (`claim_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4;

SET FOREIGN_KEY_CHECKS=1;