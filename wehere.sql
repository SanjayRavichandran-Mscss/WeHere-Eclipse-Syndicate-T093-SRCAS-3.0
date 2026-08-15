-- MySQL dump 10.13  Distrib 8.0.43, for Win64 (x86_64)
--
-- Host: localhost    Database: wehere
-- ------------------------------------------------------
-- Server version	8.0.43

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `blood_request_type`
--

DROP TABLE IF EXISTS `blood_request_type`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `blood_request_type` (
  `id` int NOT NULL AUTO_INCREMENT,
  `type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `blood_request_type`
--

LOCK TABLES `blood_request_type` WRITE;
/*!40000 ALTER TABLE `blood_request_type` DISABLE KEYS */;
INSERT INTO `blood_request_type` VALUES (1,'Emergency','2026-08-15 03:44:16','2026-08-15 03:44:16'),(2,'Scheduled','2026-08-15 03:44:16','2026-08-15 03:44:16'),(3,'Urgent','2026-08-15 03:44:16','2026-08-15 03:44:16'),(4,'Regular','2026-08-15 03:44:16','2026-08-15 03:44:16');
/*!40000 ALTER TABLE `blood_request_type` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `blood_requirement_responses`
--

DROP TABLE IF EXISTS `blood_requirement_responses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `blood_requirement_responses` (
  `id` int NOT NULL AUTO_INCREMENT,
  `blood_requirement_id` int NOT NULL,
  `user_id` int NOT NULL,
  `response_status` int DEFAULT '0',
  `remarks` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_blood_requirement_responses_blood_requirement_id` (`blood_requirement_id`),
  KEY `fk_blood_requirement_responses_user_id` (`user_id`),
  CONSTRAINT `fk_blood_requirement_responses_blood_requirement_id` FOREIGN KEY (`blood_requirement_id`) REFERENCES `blood_requirements` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_blood_requirement_responses_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `blood_requirement_responses`
--

LOCK TABLES `blood_requirement_responses` WRITE;
/*!40000 ALTER TABLE `blood_requirement_responses` DISABLE KEYS */;
/*!40000 ALTER TABLE `blood_requirement_responses` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `blood_requirements`
--

DROP TABLE IF EXISTS `blood_requirements`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `blood_requirements` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `request_type_id` int NOT NULL,
  `patient_organization_name` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `contact_person_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `contact_number` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `blood_group` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `hospital_event_name` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `location_name` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `required_date` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `units_required` int DEFAULT NULL,
  `additional_notes` text COLLATE utf8mb4_unicode_ci,
  `requirement_status` tinyint DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_blood_requirements_user_id` (`user_id`),
  KEY `fk_blood_requirements_request_type_id` (`request_type_id`),
  CONSTRAINT `fk_blood_requirements_request_type_id` FOREIGN KEY (`request_type_id`) REFERENCES `blood_request_type` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_blood_requirements_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `blood_requirements`
--

LOCK TABLES `blood_requirements` WRITE;
/*!40000 ALTER TABLE `blood_requirements` DISABLE KEYS */;
/*!40000 ALTER TABLE `blood_requirements` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `exam_questions`
--

DROP TABLE IF EXISTS `exam_questions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `exam_questions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `exam_id` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `skill` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `language` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `difficulty` enum('easy','medium','hard') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `question` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `option_a` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `option_b` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `option_c` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `option_d` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `correct_index` tinyint NOT NULL,
  `correct_answer` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `explanation` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `question_source` enum('ollama','fallback') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'ollama',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_exam_id` (`exam_id`),
  KEY `idx_exam_phase` (`exam_id`,`difficulty`)
) ENGINE=InnoDB AUTO_INCREMENT=321 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `exam_questions`
--

LOCK TABLES `exam_questions` WRITE;
/*!40000 ALTER TABLE `exam_questions` DISABLE KEYS */;
INSERT INTO `exam_questions` VALUES (201,'8','Everyday Home Safety','English','easy','What should you do first if you smell a gas leak in the kitchen?','Turn on the exhaust fan','Light a match to check where it is','Open all doors and windows','Pour water on the stove',3,'Open all doors and windows','Opening windows ventilates the gas. Never turn on electrical switches as sparks can ignite the gas.','ollama','2026-08-14 17:35:00'),(202,'8','Everyday Home Safety','English','easy','Why shouldn\'t you touch electrical switches with wet hands?','It wastes electricity','High risk of electric shock','It damages the switch','The switch gets dirty',2,'High risk of electric shock','Water conducts electricity easily, causing severe shocks.','ollama','2026-08-14 17:35:00'),(203,'8','Everyday Home Safety','English','easy','How should you put out an oil fire in a cooking pan?','Slide a metal lid over the pan','Throw a bucket of water on it','Turn on the ceiling fan','Beat it with a towel',1,'Slide a metal lid over the pan','A lid cuts off the oxygen. Throwing water on an oil fire will cause a massive explosion.','ollama','2026-08-14 17:35:00'),(204,'8','Everyday Home Safety','English','easy','What is the primary emergency number for Police in India?','108','101','104','100',4,'100','100 is the nationwide emergency number for police assistance.','ollama','2026-08-14 17:35:00'),(205,'8','Everyday Home Safety','English','easy','What is the safest way to ensure tap water is safe to drink during floods?','Freeze it','Boil it for at least 1 minute','Add a pinch of salt to it','Filter it with a cotton cloth',2,'Boil it for at least 1 minute','Boiling water kills disease-causing bacteria and parasites.','ollama','2026-08-14 17:35:00'),(206,'8','Everyday Home Safety','English','easy','If a stranger calls asking for your bank OTP to \"verify\" your account, what should you do?','Disconnect the call immediately','Give the OTP','Give a fake OTP','Ask to speak to their manager',1,'Disconnect the call immediately','Banks never ask for OTPs over the phone. It is a scam.','ollama','2026-08-14 17:35:00'),(207,'8','Everyday Home Safety','English','easy','What should you do with expired medicines at home?','Keep them for emergencies','Donate them to others','Discard them safely in the trash','Take double doses',3,'Discard them safely in the trash','Expired medicines can become toxic or lose their effectiveness.','ollama','2026-08-14 17:35:00'),(208,'8','Everyday Home Safety','English','easy','How can you prevent toddlers from pulling a heavy TV or shelf onto themselves?','Anchor the furniture to the wall','Put a blanket over it','Tell them not to touch it','Keep it in the middle of the room',1,'Anchor the furniture to the wall','Anchoring heavy furniture prevents fatal tipping accidents for children.','ollama','2026-08-14 17:35:00'),(209,'8','Everyday Home Safety','English','easy','What is a crucial safety step before locking your house for a long vacation?','Leave the windows slightly open','Turn off the main LPG gas cylinder valve','Leave all indoor lights on','Keep the AC running',2,'Turn off the main LPG gas cylinder valve','Turning off the cylinder prevents gas build-up in case of a slow leak.','ollama','2026-08-14 17:35:00'),(210,'8','Everyday Home Safety','English','easy','What is the emergency number for the Fire Brigade in India?','100','108','102','101',4,'101','101 connects you directly to the fire department.','ollama','2026-08-14 17:35:00'),(211,'8','Everyday Home Safety','English','medium','What is the universally accepted rule if your clothes catch on fire?','Run fast to blow it out','Jump up and down','Stop, Drop, and Roll','Call for help while standing still',3,'Stop, Drop, and Roll','Running feeds oxygen to the fire. Rolling smothers the flames.','ollama','2026-08-14 17:35:00'),(212,'8','Everyday Home Safety','English','medium','Why is it highly dangerous to mix bleach and toilet bowl cleaner (ammonia) while cleaning?','It creates a deadly toxic gas','It causes an explosion','It ruins the floor tiles','It neutralizes both chemicals',1,'It creates a deadly toxic gas','Mixing them creates chloramine gas, which can cause severe breathing problems or death.','ollama','2026-08-14 17:35:00'),(213,'8','Everyday Home Safety','English','medium','How can you check the expiry date of an LPG cooking gas cylinder?','Look at the bottom ring','Check the alphanumeric code (A, B, C, D) on the inner side of the top handle','Weigh the cylinder','Smell the gas near the nozzle',2,'Check the alphanumeric code (A, B, C, D) on the inner side of the top handle','A,B,C,D represent quarters of the year, followed by the expiry year (e.g., B-26 means June 2026).','ollama','2026-08-14 17:35:00'),(214,'8','Everyday Home Safety','English','medium','What is the recommended immediate action during an earthquake if you are indoors?','Run outside immediately','Stand near a glass window','Hide inside a closet','Drop to the floor, Cover your head under a desk, and Hold on',4,'Drop to the floor, Cover your head under a desk, and Hold on','Running outside during shaking increases the chance of falling debris hitting you.','ollama','2026-08-14 17:35:00'),(215,'8','Everyday Home Safety','English','medium','What is the best way to handle a person who is actively experiencing an epileptic seizure (fits)?','Put a spoon or stick in their mouth','Clear the area of sharp objects and cushion their head','Hold them down firmly so they stop shaking','Give them a glass of water immediately',2,'Clear the area of sharp objects and cushion their head','Never force objects into their mouth or restrain them, as it causes injuries.','ollama','2026-08-14 17:35:00'),(216,'8','Everyday Home Safety','English','hard','When using a straight ladder against a wall, what is the safest distance for the base of the ladder from the wall?','1 foot away for every 1 foot of height','1 foot away for every 2 feet of height','1 foot away for every 4 feet of height','Right against the wall',3,'1 foot away for every 4 feet of height','The 4-to-1 rule ensures the ladder is at a safe 75-degree angle and won\'t slip.','ollama','2026-08-14 17:35:00'),(217,'8','Everyday Home Safety','English','hard','Which type of fire extinguisher is specifically designed to safely put out electrical fires (Class C) without leaving residue?','Water','Carbon Dioxide (CO2)','Wet Chemical','Foam',2,'Carbon Dioxide (CO2)','CO2 removes oxygen from the fire and does not conduct electricity or damage electronics.','ollama','2026-08-14 17:35:00'),(218,'8','Everyday Home Safety','English','hard','In the event of a venomous snake bite, which of the following actions is considered harmful and should NEVER be done?','Sucking the venom out with your mouth','Keeping the victim perfectly calm','Immobilizing the bitten limb with a splint','Removing tight rings or watches',1,'Sucking the venom out with your mouth','Sucking venom is a myth; it causes tissue damage and can poison the person trying to help.','ollama','2026-08-14 17:35:00'),(219,'8','Everyday Home Safety','English','hard','What is the Heimlich maneuver specifically used for?','Stopping a heart attack','Curing an asthma attack','Treating a severe burn','Dislodging an object from a choking person\'s airway',4,'Dislodging an object from a choking person\'s airway','It uses upward abdominal thrusts to force air out of the lungs and push the stuck object out.','ollama','2026-08-14 17:35:00'),(220,'8','Everyday Home Safety','English','hard','Which colorless, odorless gas is known as the \"silent killer\" and can build up when running a generator in an enclosed space?','Carbon Dioxide','Nitrogen','Carbon Monoxide','Methane',3,'Carbon Monoxide','Carbon Monoxide (CO) blocks the blood\'s ability to carry oxygen, leading to silent suffocation.','ollama','2026-08-14 17:35:00'),(221,'9','Cybersecurity & Digital Safety','Hindi','easy','आपका ऑनलाइन पासवर्ड कैसा होना चाहिए?','अपना या बच्चों का नाम','123456 या जन्मतिथि','लंबा, मजबूत और जिसमे विशेष अक्षर (Symbol) हों','अपना मोबाइल नंबर',3,'लंबा, मजबूत और जिसमे विशेष अक्षर (Symbol) हों','मजबूत पासवर्ड को हैक करना मुश्किल होता है। नाम या नंबर का अनुमान लगाना बहुत आसान है।','ollama','2026-08-14 17:40:00'),(222,'9','Cybersecurity & Digital Safety','Hindi','easy','अगर आपको \"लॉटरी जीतने\" का अनजान ईमेल या मैसेज आए, तो क्या करें?','लिंक पर क्लिक करें','अपनी बैंक डिटेल्स भेजें','उसे तुरंत डिलीट या ब्लॉक करें','अपने दोस्तों को फॉरवर्ड करें',3,'उसे तुरंत डिलीट या ब्लॉक करें','यह एक आम साइबर फ्रॉड है जिसका उद्देश्य आपका पैसा चुराना होता है।','ollama','2026-08-14 17:40:00'),(223,'9','Cybersecurity & Digital Safety','Hindi','easy','बैंकिंग लेनदेन में OTP का फुल फॉर्म क्या होता है?','One Time Password','Only Two Passwords','Online Transaction Pin','One Time Pin',1,'One Time Password','OTP एक अस्थायी पासवर्ड होता है जो सिर्फ एक बार उपयोग के लिए होता है।','ollama','2026-08-14 17:40:00'),(224,'9','Cybersecurity & Digital Safety','Hindi','easy','क्या किसी बैंक कर्मचारी को फोन पर अपना ATM पिन बताना सुरक्षित है?','हाँ, क्योंकि वे बैंक से हैं','नहीं, कभी नहीं','सिर्फ बैंक मैनेजर को बता सकते हैं','अगर वो आपका आधार कार्ड मांगे तो बता दें',2,'नहीं, कभी नहीं','कोई भी बैंक कर्मचारी कभी भी आपसे आपका ATM पिन या OTP नहीं मांगता है।','ollama','2026-08-14 17:40:00'),(225,'9','Cybersecurity & Digital Safety','Hindi','easy','पब्लिक वाई-फाई (Free WiFi) का उपयोग करते समय इनमें से क्या नहीं करना चाहिए?','न्यूज़ पढ़ना','गाने सुनना','बैंकिंग लेनदेन (Net Banking / UPI)','गूगल पर कुछ खोजना',3,'बैंकिंग लेनदेन (Net Banking / UPI)','पब्लिक वाई-फाई सुरक्षित नहीं होते हैं, हैकर्स आसानी से आपके पासवर्ड और बैंक डिटेल्स चुरा सकते हैं।','ollama','2026-08-14 17:40:00'),(226,'9','Cybersecurity & Digital Safety','Hindi','easy','सोशल मीडिया पर अपनी कौन सी जानकारी पब्लिक (सार्वजनिक) नहीं रखनी चाहिए?','शौक और रुचियां (Hobbies)','घर का पूरा पता और पर्सनल फोन नंबर','पसंदीदा खाना','प्रेरणादायक विचार',2,'घर का पूरा पता और पर्सनल फोन नंबर','निजी जानकारी सार्वजनिक होने पर ब्लैकमेलिंग या आइडेंटिटी थेफ्ट (Identity Theft) का खतरा रहता है।','ollama','2026-08-14 17:40:00'),(227,'9','Cybersecurity & Digital Safety','Hindi','easy','अगर आपका फोन चोरी हो जाए, तो सबसे पहले क्या करना चाहिए?','नया फोन खरीदें','सिम ब्लॉक करवाएं और पुलिस कंप्लेंट करें','कुछ नहीं करें','दोस्तों को बताएं',2,'सिम ब्लॉक करवाएं और पुलिस कंप्लेंट करें','सिम ब्लॉक करने से चोर आपके नंबर से जुड़े बैंक खातों का उपयोग नहीं कर पाएगा।','ollama','2026-08-14 17:40:00'),(228,'9','Cybersecurity & Digital Safety','Hindi','easy','WhatsApp पर आने वाले अनजान लिंक (Unknown links) पर क्लिक करने से क्या हो सकता है?','इंटरनेट फास्ट हो जाएगा','फ्री में पैसे मिलेंगे','फोन हैक या मैलवेयर (वायरस) आ सकता है','मोबाइल की बैटरी चार्ज हो जाएगी',3,'फोन हैक या मैलवेयर (वायरस) आ सकता है','अनजान लिंक में खतरनाक वायरस हो सकते हैं जो आपका सारा डेटा चुरा सकते हैं।','ollama','2026-08-14 17:40:00'),(229,'9','Cybersecurity & Digital Safety','Hindi','easy','किसी वेबसाइट के सुरक्षित होने की पहचान कैसे होती है?','वेबसाइट बहुत सुंदर दिखती हो','URL में \"https://\" और पैडलॉक (ताला) का निशान हो','उसमें बहुत सारे विज्ञापन (Ads) हों','वो फ्री में सामान दे रही हो',2,'URL में \"https://\" और पैडलॉक (ताला) का निशान हो','HTTPS में \"S\" का मतलब Secure (सुरक्षित) होता है, जो डेटा को एन्क्रिप्ट करता है।','ollama','2026-08-14 17:40:00'),(230,'9','Cybersecurity & Digital Safety','Hindi','easy','कंप्यूटर या मोबाइल में एंटीवायरस (Antivirus) का क्या काम है?','स्क्रीन साफ करना','इंटरनेट की स्पीड बढ़ाना','डिवाइस को वायरस और मैलवेयर से बचाना','बैटरी बचाना',3,'डिवाइस को वायरस और मैलवेयर से बचाना','एंटीवायरस खतरनाक फाइलों और हैकिंग से डिवाइस की सुरक्षा करता है।','ollama','2026-08-14 17:40:00'),(231,'9','Cybersecurity & Digital Safety','Hindi','medium','साइबर सुरक्षा में \"फिशिंग\" (Phishing) का क्या मतलब है?','मछली पकड़ना','असली जैसी दिखने वाली नकली वेबसाइट/ईमेल से जानकारी चुराना','इंटरनेट की स्पीड कम होना','हार्डवेयर का खराब होना',2,'असली जैसी दिखने वाली नकली वेबसाइट/ईमेल से जानकारी चुराना','हैकर्स भरोसेमंद संस्था का भेष बनाकर आपका पासवर्ड और बैंकिंग डिटेल्स चुराते हैं।','ollama','2026-08-14 17:40:00'),(232,'9','Cybersecurity & Digital Safety','Hindi','medium','Two-Factor Authentication (2FA) या टू-स्टेप वेरिफिकेशन क्या है?','दो पासवर्ड रखना','सुरक्षा की एक अतिरिक्त परत (जैसे पासवर्ड के साथ OTP)','दो लोगों का एक साझा अकाउंट','फिंगरप्रिंट स्कैनर को दो बार दबाना',2,'सुरक्षा की एक अतिरिक्त परत (जैसे पासवर्ड के साथ OTP)','2FA चालू होने पर अगर किसी को आपका पासवर्ड पता भी चल जाए, तो भी बिना OTP के अकाउंट नहीं खुलेगा।','ollama','2026-08-14 17:40:00'),(233,'9','Cybersecurity & Digital Safety','Hindi','medium','रैनसमवेयर (Ransomware) अटैक क्या करता है?','कंप्यूटर को तेज करता है','फाइलों को लॉक (Encrypt) करके फिरौती (पैसे) मांगता है','फ्री इंटरनेट देता है','एंटीवायरस को अपडेट करता है',2,'फाइलों को लॉक (Encrypt) करके फिरौती (पैसे) मांगता है','यह आपके ही डेटा को हैक कर लेता है और उसे वापस खोलने के लिए क्रिप्टोकरेंसी (पैसे) की मांग करता है।','ollama','2026-08-14 17:40:00'),(234,'9','Cybersecurity & Digital Safety','Hindi','medium','PhonePe, GPay या Paytm पर UPI PIN का उपयोग कब किया जाता है?','सिर्फ पैसे प्राप्त (Receive) करने के लिए','पैसे भेजने (Send) और बैलेंस चेक करने के लिए','अकाउंट बनाने के लिए','कस्टमर केयर से बात करने के लिए',2,'पैसे भेजने (Send) और बैलेंस चेक करने के लिए','पैसे प्राप्त (Receive) करने के लिए कभी भी UPI PIN डालने की आवश्यकता नहीं होती है।','ollama','2026-08-14 17:40:00'),(235,'9','Cybersecurity & Digital Safety','Hindi','medium','मोबाइल में ऐप्स (Apps) डाउनलोड करने का सबसे सुरक्षित तरीका क्या है?','गूगल पर सर्च करके किसी भी वेबसाइट से','WhatsApp पर आए लिंक से','आधिकारिक स्टोर (Google Play Store / Apple App Store) से','दोस्तों से ब्लूटूथ द्वारा लेकर',3,'आधिकारिक स्टोर (Google Play Store / Apple App Store) से','आधिकारिक स्टोर में ऐप्स की सुरक्षा जांच की जाती है, बाहरी ऐप्स में वायरस हो सकता है।','ollama','2026-08-14 17:40:00'),(236,'9','Cybersecurity & Digital Safety','Hindi','hard','साइबर अपराध की दुनिया में \"सोशल इंजीनियरिंग\" (Social Engineering) हमला क्या है?','समाज में सुधार लाना','लोगों का मनोवैज्ञानिक हेरफेर करके गोपनीय जानकारी उगलवाना','सोशल मीडिया प्लेटफॉर्म को हैक करना','नेटवर्क केबल्स को काटना',2,'लोगों का मनोवैज्ञानिक हेरफेर करके गोपनीय जानकारी उगलवाना','इसमें हैकर सिस्टम को नहीं, बल्कि इंसान को बेवकूफ बनाकर जानकारी प्राप्त करता है (जैसे- डर दिखाना या लालच देना)।','ollama','2026-08-14 17:40:00'),(237,'9','Cybersecurity & Digital Safety','Hindi','hard','भारत में साइबर अपराध (Cyber Crime/Online Fraud) की रिपोर्ट करने के लिए राष्ट्रीय हेल्पलाइन नंबर क्या है?','1930','100','108','112',1,'1930','भारत सरकार द्वारा ऑनलाइन वित्तीय धोखाधड़ी की शिकायत के लिए 1930 जारी किया गया है।','ollama','2026-08-14 17:40:00'),(238,'9','Cybersecurity & Digital Safety','Hindi','hard','\"डार्क वेब\" (Dark Web) क्या है?','रात में चलने वाला इंटरनेट','इंटरनेट का वह हिस्सा जो सामान्य सर्च इंजन (जैसे Google) पर नहीं मिलता','डार्क मोड (काले रंग) वाला ब्राउज़र','खराब इंटरनेट कनेक्शन',2,'इंटरनेट का वह हिस्सा जो सामान्य सर्च इंजन (जैसे Google) पर नहीं मिलता','डार्क वेब को एक्सेस करने के लिए विशेष ब्राउज़र (जैसे TOR) की आवश्यकता होती है, यहाँ अक्सर अवैध गतिविधियां होती हैं।','ollama','2026-08-14 17:40:00'),(239,'9','Cybersecurity & Digital Safety','Hindi','hard','\"डेटा ब्रीच\" (Data Breach) का क्या अर्थ है?','डेटा का सुरक्षित बैकअप लेना','इंटरनेट डेटा खत्म हो जाना','किसी संस्था से अनधिकृत रूप से गोपनीय जानकारी का लीक होना','मोबाइल का डेटा डिलीट करना',3,'किसी संस्था से अनधिकृत रूप से गोपनीय जानकारी का लीक होना','जब हैकर्स किसी कंपनी के सर्वर से ग्राहकों के पासवर्ड या कार्ड डिटेल्स चुरा लेते हैं, तो उसे डेटा ब्रीच कहते हैं।','ollama','2026-08-14 17:40:00'),(240,'9','Cybersecurity & Digital Safety','Hindi','hard','मैलवेयर \"ट्रोजन हॉर्स\" (Trojan Horse) की मुख्य विशेषता क्या है?','यह एक उपयोगी सॉफ्टवेयर के रूप में छिपकर आता है लेकिन नुकसान पहुंचाता है','यह कंप्यूटर से घोड़े की आवाज निकालता है','यह अपने आप को कॉपी करके पूरे नेटवर्क में फैलाता है','यह सिर्फ मोबाइल फोन में आता है',1,'यह एक उपयोगी सॉफ्टवेयर के रूप में छिपकर आता है लेकिन नुकसान पहुंचाता है','यूजर्स इसे काम का सॉफ्टवेयर समझकर इंस्टॉल करते हैं, लेकिन पीछे से यह हैकर्स को एक्सेस दे देता है।','ollama','2026-08-14 17:40:00'),(241,'10','Basic Legal Rights','Malayalam','easy','ഇന്ത്യയിൽ വോട്ട് ചെയ്യാനുള്ള നിയമപരമായ പ്രായം എത്രയാണ്?','16','18','21','25',2,'18','ഇന്ത്യൻ ഭരണഘടന പ്രകാരം 18 വയസ്സ് പൂർത്തിയായ ഏതൊരു പൗരനും വോട്ട് ചെയ്യാൻ അവകാശമുണ്ട്.','ollama','2026-08-14 17:45:00'),(242,'10','Basic Legal Rights','Malayalam','easy','മോട്ടോർ വാഹനം ഓടിക്കുന്നതിന് നിർബന്ധമായും വേണ്ട രേഖ ഏതാണ്?','റേഷൻ കാർഡ്','ഡ്രൈവിംഗ് ലൈസൻസ്','വോട്ടർ ഐഡി','പാസ്സ്‌പോർട്ട്',2,'ഡ്രൈവിംഗ് ലൈസൻസ്','നിയമപരമായി പൊതുനിരത്തിൽ വാഹനം ഓടിക്കാൻ ഡ്രൈവിംഗ് ലൈസൻസ് നിർബന്ധമാണ്.','ollama','2026-08-14 17:45:00'),(243,'10','Basic Legal Rights','Malayalam','easy','വിവരാവകാശ നിയമം (RTI) പ്രകാരം പൗരന്മാർക്ക് എവിടെ നിന്നാണ് വിവരങ്ങൾ ലഭിക്കുന്നത്?','സ്വകാര്യ കമ്പനികൾ','സർക്കാർ വകുപ്പുകൾ','വിദേശ രാജ്യങ്ങൾ','സ്വകാര്യ ആശുപത്രികൾ',2,'സർക്കാർ വകുപ്പുകൾ','സർക്കാർ ഓഫീസുകളുടെയും പൊതു സ്ഥാപനങ്ങളുടെയും വിവരങ്ങൾ അറിയാൻ RTI സഹായിക്കുന്നു.','ollama','2026-08-14 17:45:00'),(244,'10','Basic Legal Rights','Malayalam','easy','പോലീസിൽ നൽകുന്ന FIR ന്റെ പൂർണ്ണരൂപം എന്ത്?','First Investigation Report','First Information Report','Formal Incident Record','Final Information Report',2,'First Information Report','ഒരു കുറ്റകൃത്യത്തെക്കുറിച്ച് പോലീസിന് ലഭിക്കുന്ന ആദ്യ വിവരത്തെയാണ് FIR എന്ന് വിളിക്കുന്നത്.','ollama','2026-08-14 17:45:00'),(245,'10','Basic Legal Rights','Malayalam','easy','ഇന്ത്യയിൽ സ്ത്രീധനം വാങ്ങുന്നതും കൊടുക്കുന്നതും നിയമപരമാണോ?','അതെ','അല്ല (ഇതൊരു കുറ്റകൃത്യമാണ്)','പണക്കാർക്ക് മാത്രം ആകാം','അനുമതിയോടെ ആകാം',2,'അല്ല (ഇതൊരു കുറ്റകൃത്യമാണ്)','സ്ത്രീധന നിരോധന നിയമപ്രകാരം ഇത് ജാമ്യമില്ലാ കുറ്റമാണ്.','ollama','2026-08-14 17:45:00'),(246,'10','Basic Legal Rights','Malayalam','easy','ഇന്ത്യയിൽ എത്ര വയസ്സിന് താഴെയുള്ള കുട്ടികളെ ജോലിക്ക് വയ്ക്കുന്നതാണ് പൂർണ്ണമായും നിരോധിച്ചിട്ടുള്ളത്?','18','16','14','12',3,'14','ബാലവേല നിരോധന നിയമപ്രകാരം 14 വയസ്സിന് താഴെയുള്ള കുട്ടികളെ ജോലി ചെയ്യിക്കുന്നത് കുറ്റകരമാണ്.','ollama','2026-08-14 17:45:00'),(247,'10','Basic Legal Rights','Malayalam','easy','ഇന്ത്യയിലെ വനിതാ ഹെൽപ്പ്‌ലൈൻ (Women\'s Helpline) നമ്പർ ഏതാണ്?','100','1091','101','108',2,'1091','സ്ത്രീകൾക്കെതിരെയുള്ള അതിക്രമങ്ങൾ അറിയിക്കാനും സഹായത്തിനും 1091 എന്ന നമ്പർ ഉപയോഗിക്കാം.','ollama','2026-08-14 17:45:00'),(248,'10','Basic Legal Rights','Malayalam','easy','സാമ്പത്തിക ഇടപാടുകൾക്കും ആദായ നികുതി ആവശ്യങ്ങൾക്കുമായി ഉപയോഗിക്കുന്ന പ്രധാന കാർഡ് ഏതാണ്?','റേഷൻ കാർഡ്','ഹെൽത്ത് കാർഡ്','പാൻ കാർഡ് (PAN Card)','ലൈബ്രറി കാർഡ്',3,'പാൻ കാർഡ് (PAN Card)','ഇൻകം ടാക്സ് റിട്ടേൺ ഫയൽ ചെയ്യാനും വലിയ തുകയുടെ ബാങ്ക് ഇടപാടുകൾക്കും പാൻ കാർഡ് നിർബന്ധമാണ്.','ollama','2026-08-14 17:45:00'),(249,'10','Basic Legal Rights','Malayalam','easy','ഒരു മജിസ്‌ട്രേറ്റിന് മുമ്പാകെ ഹാജരാക്കാതെ പോലീസിന് പരമാവധി എത്ര സമയം ഒരാളെ കസ്റ്റഡിയിൽ വയ്ക്കാം?','24 മണിക്കൂർ','48 മണിക്കൂർ','1 ആഴ്ച','1 മാസം',1,'24 മണിക്കൂർ','അറസ്റ്റ് ചെയ്ത് 24 മണിക്കൂറിനുള്ളിൽ പ്രതിയെ മജിസ്ട്രേറ്റിന് മുന്നിൽ ഹാജരാക്കണം എന്നത് മൗലിക അവകാശമാണ്.','ollama','2026-08-14 17:45:00'),(250,'10','Basic Legal Rights','Malayalam','easy','ഉപഭോക്തൃ കോടതി (Consumer Court) എന്തുമായി ബന്ധപ്പെട്ട പരാതികളാണ് കൈകാര്യം ചെയ്യുന്നത്?','ക്രിമിനൽ കേസുകൾ','വസ്തു തർക്കങ്ങൾ','ഉൽപ്പന്നങ്ങൾക്കും സേവനങ്ങൾക്കും എതിരെയുള്ള പരാതികൾ','വിവാഹമോചന കേസുകൾ',3,'ഉൽപ്പന്നങ്ങൾക്കും സേവനങ്ങൾക്കും എതിരെയുള്ള പരാതികൾ','കേടുവന്ന ഉൽപ്പന്നങ്ങൾ അല്ലെങ്കിൽ മോശം സേവനങ്ങൾ എന്നിവയ്ക്കെതിരെ ഉപഭോക്താക്കൾക്ക് ഇവിടെ പരാതി നൽകാം.','ollama','2026-08-14 17:45:00'),(251,'10','Basic Legal Rights','Malayalam','medium','ഹേബിയസ് കോർപ്പസ് (Habeas Corpus) ഹർജി എന്തിനുവേണ്ടിയാണ് ഫയൽ ചെയ്യുന്നത്?','ജാമ്യം ലഭിക്കാൻ','നിയമവിരുദ്ധമായി തടവിലാക്കപ്പെട്ട ആളെ കോടതിയിൽ ഹാജരാക്കാൻ','വസ്തു രജിസ്റ്റർ ചെയ്യാൻ','വായ്പ ലഭിക്കാൻ',2,'നിയമവിരുദ്ധമായി തടവിലാക്കപ്പെട്ട ആളെ കോടതിയിൽ ഹാജരാക്കാൻ','കാണാതായ അല്ലെങ്കിൽ അന്യായമായി പോലീസ് തടവിലാക്കിയ ആളുകളെ കണ്ടെത്താൻ ഹൈക്കോടതിയിലോ സുപ്രീംകോടതിയിലോ ഇത് ഫയൽ ചെയ്യാം.','ollama','2026-08-14 17:45:00'),(252,'10','Basic Legal Rights','Malayalam','medium','മുൻകൂർ ജാമ്യം (Anticipatory Bail) ഏത് സാഹചര്യത്തിലാണ് ഒരു വ്യക്തിക്ക് ലഭിക്കുന്നത്?','ശിക്ഷിക്കപ്പെട്ട ശേഷം','കള്ളക്കേസിൽ അറസ്റ്റ് ചെയ്യപ്പെടുമെന്ന ഭയമുള്ളപ്പോൾ (അറസ്റ്റിന് മുൻപ്)','1 വർഷം ജയിലിൽ കഴിഞ്ഞ ശേഷം','സിവിൽ കേസുകളിൽ മാത്രം',2,'കള്ളക്കേസിൽ അറസ്റ്റ് ചെയ്യപ്പെടുമെന്ന ഭയമുള്ളപ്പോൾ (അറസ്റ്റിന് മുൻപ്)','അറസ്റ്റ് ചെയ്യപ്പെടുന്നതിന് മുൻപ് തന്നെ കോടതിയിൽ നിന്ന് മുൻകൂർ ജാമ്യം നേടാൻ കഴിയും.','ollama','2026-08-14 17:45:00'),(253,'10','Basic Legal Rights','Malayalam','medium','അധികാരപരിധി (Jurisdiction) ഇല്ലെന്ന കാരണത്താൽ പോലീസിന് \'സീറോ എഫ്‌ഐആർ\' (Zero FIR) രജിസ്റ്റർ ചെയ്യാൻ വിസമ്മതിക്കാമോ?','അതെ വിസമ്മതിക്കാം','ഇല്ല (വിസമ്മതിക്കാൻ പാടില്ല)','മോഷണക്കേസുകളിൽ മാത്രം വിസമ്മതിക്കാം','രാത്രിയിൽ മാത്രം വിസമ്മതിക്കാം',2,'ഇല്ല (വിസമ്മതിക്കാൻ പാടില്ല)','ഏത് പോലീസ് സ്റ്റേഷനിലും പരാതി നൽകാം. അവർ സീറോ FIR രജിസ്റ്റർ ചെയ്ത ശേഷം ബന്ധപ്പെട്ട സ്റ്റേഷനിലേക്ക് കേസ് മാറ്റണം.','ollama','2026-08-14 17:45:00'),(254,'10','Basic Legal Rights','Malayalam','medium','വിദ്യാഭ്യാസ അവകാശ നിയമം (RTE) പ്രകാരം ഏത് പ്രായത്തിലുള്ള കുട്ടികൾക്കാണ് സൗജന്യവും നിർബന്ധിതവുമായ വിദ്യാഭ്യാസം ഉറപ്പാക്കുന്നത്?','5 മുതൽ 10 വരെ','6 മുതൽ 14 വയസ്സു വരെ','10 മുതൽ 18 വരെ','ജനനം മുതൽ 18 വരെ',2,'6 മുതൽ 14 വയസ്സു വരെ','ഇത് കുട്ടികളുടെ മൗലിക അവകാശമായി ഭരണഘടന ഉറപ്പുനൽകുന്നു.','ollama','2026-08-14 17:45:00'),(255,'10','Basic Legal Rights','Malayalam','medium','ബാങ്കിൽ നൽകിയ ചെക്ക് മടങ്ങുന്ന (Cheque Bounce) കേസുകളിൽ ഏത് നിയമപ്രകാരമാണ് പരാതി നൽകേണ്ടത്?','ഇന്ത്യൻ പീനൽ കോഡ് (IPC)','നെഗോഷ്യബിൾ ഇൻസ്ട്രുമെന്റ്സ് (NI) ആക്ട്','ഉപഭോക്തൃ സംരക്ഷണ നിയമം','റിസർവ് ബാങ്ക് നിയമം',2,'നെഗോഷ്യബിൾ ഇൻസ്ട്രുമെന്റ്സ് (NI) ആക്ട്','ചെക്ക് മടങ്ങുന്നത് NI Act Section 138 പ്രകാരം ക്രിമിനൽ കുറ്റമാണ്.','ollama','2026-08-14 17:45:00'),(256,'10','Basic Legal Rights','Malayalam','hard','ആദായനികുതി നിയമപ്രകാരം പിഴ ഒഴിവാക്കാൻ ഒരു വ്യക്തിക്ക് ഒറ്റത്തവണയായി പരമാവധി എത്ര രൂപ വരെയെ പണമായി (Cash) ഇടപാട് നടത്താൻ പാടുള്ളൂ?','50,000 രൂപ','1,00,000 രൂപ','2,00,000 രൂപയ്ക്ക് താഴെ','5,00,000 രൂപ',3,'2,00,000 രൂപയ്ക്ക് താഴെ','2 ലക്ഷം രൂപയോ അതിൽ കൂടുതലോ ഉള്ള ഇടപാടുകൾ ബാങ്ക് മുഖേന മാത്രമേ നടത്താൻ പാടുള്ളൂ.','ollama','2026-08-14 17:45:00'),(257,'10','Basic Legal Rights','Malayalam','hard','പിതൃസ്വത്തിൽ (Ancestral Property) മകനെപ്പോലെ തന്നെ മകൾക്കും തുല്യ അവകാശമുണ്ടോ?','ഇല്ല','അവിവാഹിതർക്ക് മാത്രം','ഉണ്ട് (2005 ലെ നിയമ ഭേദഗതി പ്രകാരം)','മകൻ ഇല്ലെങ്കിൽ മാത്രം',3,'ഉണ്ട് (2005 ലെ നിയമ ഭേദഗതി പ്രകാരം)','2005 ലെ ഹിന്ദു പിന്തുടർച്ചാവകാശ നിയമ ഭേദഗതിയോടെ പെൺമക്കൾക്കും തുല്യ അവകാശം ലഭിച്ചു.','ollama','2026-08-14 17:45:00'),(258,'10','Basic Legal Rights','Malayalam','hard','സൂര്യാസ്തമയത്തിനും സൂര്യോദയത്തിനും ഇടയിൽ (രാത്രികാലങ്ങളിൽ) ഒരു സ്ത്രീയെ അറസ്റ്റ് ചെയ്യാൻ പോലീസിന് അധികാരമുണ്ടോ?','അതെ (എപ്പോഴും ചെയ്യാം)','ഇല്ല (മജിസ്‌ട്രേറ്റിന്റെ രേഖാമൂലമുള്ള പ്രത്യേക അനുമതി ഇല്ലാതെ പാടില്ല)','അതെ (പുരുഷ പോലീസ് ഉണ്ടെങ്കിൽ)','അതെ (ചെറിയ കുറ്റമാണെങ്കിൽ)',2,'ഇല്ല (മജിസ്‌ട്രേറ്റിന്റെ രേഖാമൂലമുള്ള പ്രത്യേക അനുമതി ഇല്ലാതെ പാടില്ല)','അസാധാരണ സാഹചര്യങ്ങളിൽ അല്ലാതെ രാത്രി സമയത്ത് സ്ത്രീകളെ അറസ്റ്റ് ചെയ്യാൻ പാടില്ല.','ollama','2026-08-14 17:45:00'),(259,'10','Basic Legal Rights','Malayalam','hard','കൊഗ്നിസബിൾ ഒഫൻസ് (Cognizable Offence) എന്നാൽ എന്താണ്?','ചെറിയ ട്രാഫിക് നിയമലംഘനങ്ങൾ','അറസ്റ്റ് ചെയ്യാൻ വാറണ്ട് ആവശ്യമുള്ള കേസുകൾ','വാറണ്ട് ഇല്ലാതെ തന്നെ പോലീസിന് അറസ്റ്റ് ചെയ്യാവുന്ന ഗുരുതരമായ കുറ്റകൃത്യങ്ങൾ','വസ്തു തർക്കങ്ങൾ',3,'വാറണ്ട് ഇല്ലാതെ തന്നെ പോലീസിന് അറസ്റ്റ് ചെയ്യാവുന്ന ഗുരുതരമായ കുറ്റകൃത്യങ്ങൾ','കൊലപാതകം, ബലാത്സംഗം, തട്ടിക്കൊണ്ടുപോകൽ തുടങ്ങിയവ ഇത്തരം കുറ്റകൃത്യങ്ങളിൽ പെടുന്നു.','ollama','2026-08-14 17:45:00'),(260,'10','Basic Legal Rights','Malayalam','hard','ലോക് അദാലത്തിന്റെ (Lok Adalat) പ്രധാന ഉദ്ദേശ്യം എന്താണ്?','തീവ്രവാദ കേസുകൾ കൈകാര്യം ചെയ്യാൻ','കോടതികളിൽ കെട്ടിക്കിടക്കുന്ന കേസുകൾ പരസ്പര സമ്മതത്തോടെ വേഗത്തിൽ തീർപ്പാക്കാൻ','പുതിയ നിയമങ്ങൾ പാസാക്കാൻ','പോലീസ് അന്വേഷണം നടത്താൻ',2,'കോടതികളിൽ കെട്ടിക്കിടക്കുന്ന കേസുകൾ പരസ്പര സമ്മതത്തോടെ വേഗത്തിൽ തീർപ്പാക്കാൻ','പണച്ചെലവില്ലാതെ വേഗത്തിൽ തർക്കങ്ങൾ പരിഹരിക്കാനുള്ള ഒരു ബദൽ സംവിധാനമാണിത്.','ollama','2026-08-14 17:45:00'),(261,'11','Python, ML, System Architecture','Telugu','easy','పైథాన్ (Python) లో ఒక ఫంక్షన్ ని క్రియేట్ చేయడానికి ఏ కీవర్డ్ ఉపయోగిస్తారు?','function','def','fun','create',2,'def','పైథాన్ లో ఫంక్షన్ లను డిఫైన్ చేయడానికి def అనే కీవర్డ్ ను ఉపయోగిస్తారు.','ollama','2026-08-14 17:50:00'),(262,'11','Python, ML, System Architecture','Telugu','easy','మెషిన్ లెర్నింగ్ (Machine Learning) అనగా ఏమిటి?','కంప్యూటర్లకు డేటా ద్వారా నేర్చుకునే సామర్థ్యాన్ని ఇవ్వడం','కంప్యూటర్ భాగాలను తయారు చేయడం','ఇంటర్నెట్ స్పీడ్ పెంచడం','కీబోర్డ్ వాడటం నేర్చుకోవడం',1,'కంప్యూటర్లకు డేటా ద్వారా నేర్చుకునే సామర్థ్యాన్ని ఇవ్వడం','ప్రోగ్రామింగ్ చేయకుండానే, డేటా నుండి ప్యాటర్న్స్ ని గుర్తించి నేర్చుకునే విధానమే మెషిన్ లెర్నింగ్.','ollama','2026-08-14 17:50:00'),(263,'11','Python, ML, System Architecture','Telugu','easy','సిస్టమ్ ఆర్కిటెక్చర్ లో \"క్లయింట్-సర్వర్\" (Client-Server) మోడల్ లో క్లయింట్ యొక్క ప్రధాన పని ఏమిటి?','డేటాని శాశ్వతంగా స్టోర్ చేయడం','ఇతర సర్వర్లను కంట్రోల్ చేయడం','సర్వర్ కు రిక్వెస్ట్ పంపి, సమాచారాన్ని పొందడం','సర్వర్ కి కరెంటు ఇవ్వడం',3,'సర్వర్ కు రిక్వెస్ట్ పంపి, సమాచారాన్ని పొందడం','క్లయింట్ (ఉదాహరణకు వెబ్ బ్రౌజర్) సర్వర్ కు డేటా కోసం రిక్వెస్ట్ పంపుతుంది.','ollama','2026-08-14 17:50:00'),(264,'11','Python, ML, System Architecture','Telugu','easy','పైథాన్ లో లిస్ట్ (List) ని ఏ బ్రాకెట్స్ తో సూచిస్తారు?','( )','[ ]','{ }','< >',2,'[ ]','పైథాన్ లో లిస్ట్ లను స్క్వేర్ బ్రాకెట్స్ [ ] తో తయారు చేస్తారు.','ollama','2026-08-14 17:50:00'),(265,'11','Python, ML, System Architecture','Telugu','easy','డేటా సైన్స్ మరియు మెషిన్ లెర్నింగ్ లో ప్రస్తుతం ఎక్కువగా ఉపయోగిస్తున్న ప్రోగ్రామింగ్ భాష ఏది?','Java','C++','PHP','Python',4,'Python','సులువైన సింటాక్స్ మరియు మంచి లైబ్రరీలు (Pandas, Scikit-learn) ఉండటం వల్ల పైథాన్ ప్రాచుర్యం పొందింది.','ollama','2026-08-14 17:50:00'),(266,'11','Python, ML, System Architecture','Telugu','easy','ఒక వెబ్ అప్లికేషన్ లో యూజర్ల డేటాని సురక్షితంగా స్టోర్ చేసే భాగాన్ని ఏమంటారు?','ఫ్రంట్-ఎండ్ (Front-end)','సర్వర్ (Server)','డేటాబేస్ (Database)','యూజర్ ఇంటర్ఫేస్ (UI)',3,'డేటాబేస్ (Database)','MySQL, MongoDB వంటి డేటాబేస్ లలో సమాచారం శాశ్వతంగా స్టోర్ అవుతుంది.','ollama','2026-08-14 17:50:00'),(267,'11','Python, ML, System Architecture','Telugu','easy','పైథాన్ లో సింగిల్ లైన్ కామెంట్ (Comment) రాయడానికి ఏ సింబల్ వాడతారు?','//','#','/* */','--',2,'#','హ్యాష్ (#) సింబల్ ద్వారా పైథాన్ లో కామెంట్స్ రాస్తారు. ఇవి ప్రోగ్రామ్ రన్ అయ్యేటప్పుడు ఎగ్జిక్యూట్ అవ్వవు.','ollama','2026-08-14 17:50:00'),(268,'11','Python, ML, System Architecture','Telugu','easy','మెషిన్ లెర్నింగ్ లో ఇన్పుట్ డేటాతో పాటే ఫలితాన్ని (Target/Label) కూడా ఇస్తే, దానిని ఏమని పిలుస్తారు?','సూపర్వైజ్డ్ లెర్నింగ్ (Supervised Learning)','అన్-సూపర్వైజ్డ్ లెర్నింగ్','రీఇన్ఫోర్స్మెంట్ లెర్నింగ్','డీప్ లెర్నింగ్',1,'సూపర్వైజ్డ్ లెర్నింగ్ (Supervised Learning)','దీనిలో మోడల్ ముందే తెలిసిన ఉదాహరణల (labeled data) నుండి నేర్చుకుంటుంది.','ollama','2026-08-14 17:50:00'),(269,'11','Python, ML, System Architecture','Telugu','easy','సాఫ్ట్‌వేర్ డెవలప్మెంట్ లో API అనగా ఏమిటి?','అడ్వాన్స్డ్ ప్రోగ్రామింగ్ ఇంటర్నెట్','అప్లికేషన్ ప్రోగ్రామింగ్ ఇంటర్ఫేస్','ఆటోమేటిక్ ప్రాసెస్ ఇండెక్స్','యాంటీ పైరసీ ఇంటర్ఫేస్',2,'అప్లికేషన్ ప్రోగ్రామింగ్ ఇంటర్ఫేస్','రెండు వేర్వేరు సాఫ్ట్‌వేర్ అప్లికేషన్లు ఒకదానితో ఒకటి మాట్లాడుకోవడానికి API సహాయపడుతుంది.','ollama','2026-08-14 17:50:00'),(270,'11','Python, ML, System Architecture','Telugu','easy','పైథాన్ లో డేటాని స్క్రీన్ పై ప్రింట్ చేయడానికి ఏ ఫంక్షన్ ఉపయోగిస్తారు?','echo()','display()','write()','print()',4,'print()','సమాచారాన్ని కన్సోల్ పై చూపించడానికి print() ఫంక్షన్ వాడతారు.','ollama','2026-08-14 17:50:00'),(271,'11','Python, ML, System Architecture','Telugu','medium','పైథాన్ లో డేటా ఎనాలసిస్ (Data Analysis) కోసం ఎక్కువగా ఉపయోగించే లైబ్రరీ ఏది?','Requests','Pandas','Flask','Django',2,'Pandas','డేటాని టేబుల్స్ (DataFrames) రూపంలో మార్చి, విశ్లేషించడానికి పాండాస్ (Pandas) అద్భుతంగా పనిచేస్తుంది.','ollama','2026-08-14 17:50:00'),(272,'11','Python, ML, System Architecture','Telugu','medium','సిస్టమ్ డిజైన్ లో \"లోడ్ బ్యాలెన్సర్\" (Load Balancer) యొక్క ముఖ్య ఉద్దేశ్యం ఏమిటి?','డేటాని ఎన్క్రిప్ట్ చేయడం','ఇన్కమింగ్ నెట్వర్క్ ట్రాఫిక్ ని బహుళ సర్వర్లకు సమానంగా పంచడం','వెబ్ పేజీలను డిజైన్ చేయడం','డేటాబేస్ ని బ్యాకప్ తీసుకోవడం',2,'ఇన్కమింగ్ నెట్వర్క్ ట్రాఫిక్ ని బహుళ సర్వర్లకు సమానంగా పంచడం','ట్రాఫిక్ ఎక్కువైనప్పుడు ఏ ఒక్క సర్వర్ క్రాష్ అవ్వకుండా లోడ్ బ్యాలెన్సర్ కాపాడుతుంది.','ollama','2026-08-14 17:50:00'),(273,'11','Python, ML, System Architecture','Telugu','medium','మెషిన్ లెర్నింగ్ లో \"ఓవర్ ఫిట్టింగ్\" (Overfitting) అంటే ఏమిటి?','మోడల్ చాలా వేగంగా రన్ అవ్వడం','మోడల్ ట్రైనింగ్ డేటాని కంఠస్థం చేసి, కొత్త డేటాపై సరిగ్గా పనిచేయకపోవడం','మోడల్ కి తక్కువ డేటా ఇవ్వడం','ఎక్కువ ఫీచర్స్ వాడకపోవడం',2,'మోడల్ ట్రైనింగ్ డేటాని కంఠస్థం చేసి, కొత్త డేటాపై సరిగ్గా పనిచేయకపోవడం','ఓవర్ ఫిట్టింగ్ వల్ల మోడల్ పాత డేటాకి అద్భుతమైన ఫలితాలు ఇస్తుంది కానీ రియల్ వరల్డ్ డేటాపై ఫెయిల్ అవుతుంది.','ollama','2026-08-14 17:50:00'),(274,'11','Python, ML, System Architecture','Telugu','medium','మోనోలిథిక్ (Monolithic) మరియు మైక్రోసర్వీసెస్ (Microservices) ఆర్కిటెక్చర్ కు ప్రధాన తేడా ఏమిటి?','మోనోలిథిక్ లో కోడ్ అంతా ఒకే పెద్ద బ్లాక్ గా ఉంటుంది, మైక్రోసర్వీసెస్ లో చిన్న చిన్న సర్వీసులుగా విడదీయబడుతుంది','మైక్రోసర్వీసెస్ నెమ్మదిగా పనిచేస్తాయి','మోనోలిథిక్ లో మాత్రమే API లు వాడతారు','రెండింటిలో తేడా లేదు',1,'మోనోలిథిక్ లో కోడ్ అంతా ఒకే పెద్ద బ్లాక్ గా ఉంటుంది, మైక్రోసర్వీసెస్ లో చిన్న చిన్న సర్వీసులుగా విడదీయబడుతుంది','మైక్రోసర్వీసెస్ ఆర్కిటెక్చర్ లో ప్రతి సర్వీస్ ను విడిగా డెవలప్ మరియు డిప్లాయ్ చేయవచ్చు.','ollama','2026-08-14 17:50:00'),(275,'11','Python, ML, System Architecture','Telugu','medium','పైథాన్ క్లాస్ (Class) లో `__init__` మెథడ్ ని ఏమంటారు?','డిస్ట్రక్టర్ (Destructor)','జనరేటర్ (Generator)','కన్స్ట్రక్టర్ (Constructor)','డెకరేటర్ (Decorator)',3,'కన్స్ట్రక్టర్ (Constructor)','ఆబ్జెక్ట్ ని క్రియేట్ చేసిన వెంటనే వేరియబుల్స్ కి ప్రారంభ విలువలు ఇవ్వడానికి కన్స్ట్రక్టర్ ని ఉపయోగిస్తారు.','ollama','2026-08-14 17:50:00'),(276,'11','Python, ML, System Architecture','Telugu','hard','సిస్టమ్ ఆర్కిటెక్చర్ లో \"హారిజాంటల్ స్కేలింగ్\" (Horizontal Scaling / Scaling Out) అనగా ఏమిటి?','ఉన్న సర్వర్ యొక్క ర్యామ్ (RAM) పెంచడం','సిస్టమ్ కు కొత్త సర్వర్లను/మెషీన్లను జోడించడం','డేటాబేస్ సైజు తగ్గించడం','పాత కోడ్ ని తీసివేయడం',2,'సిస్టమ్ కు కొత్త సర్వర్లను/మెషీన్లను జోడించడం','ఎక్కువ ట్రాఫిక్ ని తట్టుకోవడానికి సమాంతరంగా కొత్త సర్వర్లను యాడ్ చేయడాన్ని హారిజాంటల్ స్కేలింగ్ అంటారు.','ollama','2026-08-14 17:50:00'),(277,'11','Python, ML, System Architecture','Telugu','hard','పైథాన్ లో \"డెకరేటర్స్\" (Decorators) యొక్క ముఖ్య ఉద్దేశ్యం ఏమిటి?','కోడ్ ని అందంగా మార్చడం','లోకల్ వేరియబుల్స్ ని గ్లోబల్ గా మార్చడం','ఉన్న ఫంక్షన్ యొక్క ఒరిజినల్ కోడ్ ని మార్చకుండా దాని ప్రవర్తనను పొడిగించడం','కొత్త క్లాస్ ని క్రియేట్ చేయడం',3,'ఉన్న ఫంక్షన్ యొక్క ఒరిజినల్ కోడ్ ని మార్చకుండా దాని ప్రవర్తనను పొడిగించడం','డెకరేటర్స్ ఒక ఫంక్షన్ ని ఆర్గ్యుమెంట్ గా తీసుకుని, దానికి కొత్త ఫీచర్లని యాడ్ చేసి రిటర్న్ చేస్తాయి (ఉదాహరణ: @login_required).','ollama','2026-08-14 17:50:00'),(278,'11','Python, ML, System Architecture','Telugu','hard','మెషిన్ లెర్నింగ్ లో అన్-సూపర్వైజ్డ్ లెర్నింగ్ (Unsupervised Learning) కు ఉత్తమ ఉదాహరణ ఏది?','క్లాసిఫికేషన్ (Classification)','లీనియర్ రిగ్రెషన్ (Linear Regression)','క్లస్టరింగ్ (Clustering)','డెసిషన్ ట్రీ (Decision Tree)',3,'క్లస్టరింగ్ (Clustering)','దీనిలో లేబుల్స్ లేని డేటాలోని ప్యాటర్న్స్ లేదా గ్రూపులను (ఉదా: K-Means) అల్గోరిథం స్వయంగా కనుక్కుంటుంది.','ollama','2026-08-14 17:50:00'),(279,'11','Python, ML, System Architecture','Telugu','hard','మైక్రోసర్వీసెస్ ఒకదానితో ఒకటి మాట్లాడుకోవడానికి (Communication) సాధారణంగా ఉపయోగించే ప్రోటోకాల్స్ ఏవి?','FTP మరియు SMTP','HTTP/REST లేదా gRPC','POP3 మరియు IMAP','TELNET',2,'HTTP/REST లేదా gRPC','మైక్రోసర్వీసెస్ సాధారణంగా REST API లు లేదా తక్కువ లేటెన్సీ కోసం gRPC ద్వారా కమ్యూనికేట్ చేసుకుంటాయి.','ollama','2026-08-14 17:50:00'),(280,'11','Python, ML, System Architecture','Telugu','hard','పైథాన్ లో మెమరీని ఆదా చేయడానికి, ఒకేసారి మొత్తం డేటాని మెమరీలో లోడ్ చేయకుండా వాడే టెక్నిక్ ఏది?','జనరేటర్స్ (Generators) `yield` తో','లిస్ట్ కాంప్రహెన్షన్ (List Comprehension)','డిక్షనరీస్ (Dictionaries)','లాంబ్డా ఫంక్షన్స్ (Lambda)',1,'జనరేటర్స్ (Generators) `yield` తో','జనరేటర్స్ `yield` కీవర్డ్ ద్వారా ఒకసారికి ఒక ఐటెమ్ ని మాత్రమే ఇస్తాయి, దీనివల్ల పెద్ద డేటా సెట్స్ కి మెమరీ ఆదా అవుతుంది.','ollama','2026-08-14 17:50:00'),(281,'12','Patient care & Diagnostics','Telugu','easy','సాధారణ ఆరోగ్యవంతమైన వయోజన మానవుని రక్తపోటు (Blood Pressure) ఎంత ఉండాలి?','90/60 mmHg','120/80 mmHg','140/90 mmHg','160/100 mmHg',2,'120/80 mmHg','సాధారణ రక్తపోటు 120/80 mmHg గా పరిగణించబడుతుంది.','ollama','2026-08-14 17:55:00'),(282,'12','Patient care & Diagnostics','Telugu','easy','గుండె చప్పుడు (Heartbeats) మరియు ఊపిరితిత్తుల శబ్దాలను వినడానికి వైద్యులు ఉపయోగించే పరికరం ఏది?','థర్మామీటర్','స్ఫిగ్మోమానోమీటర్','స్టెతస్కోప్ (Stethoscope)','ఎండోస్కోప్',3,'స్టెతస్కోప్ (Stethoscope)','స్టెతస్కోప్ ద్వారా గుండె మరియు ఊపిరితిత్తుల శబ్దాలను స్పష్టంగా వినవచ్చు.','ollama','2026-08-14 17:55:00'),(283,'12','Patient care & Diagnostics','Telugu','easy','అత్యవసర పరిస్థితుల్లో (గుండె ఆగిపోయినప్పుడు) ప్రాణాలు కాపాడే CPR అనగా ఏమిటి?','కార్డియో పల్మనరీ రెస్క్యూ','కార్డియోపల్మనరీ రిససిటేషన్ (Cardiopulmonary Resuscitation)','క్లినికల్ పల్స్ రేట్','కార్డియాక్ పేషెంట్ రికవరీ',2,'కార్డియోపల్మనరీ రిససిటేషన్ (Cardiopulmonary Resuscitation)','CPR అనేది శ్వాస ఆగిపోయినప్పుడు చేసే లైఫ్ సేవింగ్ టెక్నిక్.','ollama','2026-08-14 17:55:00'),(284,'12','Patient care & Diagnostics','Telugu','easy','సాధారణ వయోజనులలో విశ్రాంతి సమయంలో నిమిషానికి గుండె స్పందన (Resting Pulse Rate) ఎంత ఉండాలి?','40-60','60-100','100-120','120-150',2,'60-100','సాధారణ వ్యక్తి నాడి నిమిషానికి 60 నుండి 100 సార్లు కొట్టుకుంటుంది.','ollama','2026-08-14 17:55:00'),(285,'12','Patient care & Diagnostics','Telugu','easy','గుండె విద్యుత్ పనితీరును రికార్డ్ చేసే డయాగ్నస్టిక్ టెస్ట్ ECG అనగా ఏమిటి?','ఎకోకార్డియోగ్రామ్','ఎలక్ట్రోకార్డియోగ్రామ్ (Electrocardiogram)','ఎలక్ట్రిక్ కోర్ గ్రాఫ్','ఎలక్ట్రోసెఫలోగ్రామ్',2,'ఎలక్ట్రోకార్డియోగ్రామ్ (Electrocardiogram)','ECG ద్వారా గుండె లయను మరియు గుండెపోటు లక్షణాలను గుర్తిస్తారు.','ollama','2026-08-14 17:55:00'),(286,'12','Patient care & Diagnostics','Telugu','easy','ఒక పేషెంట్ అకస్మాత్తుగా స్పృహ కోల్పోయినప్పుడు (Unconscious) మొదటగా ఏమి చేయాలి?','నీళ్ళు తాగించాలి','స్పందన మరియు శ్వాస ఆడుతుందో లేదో చెక్ చేయాలి','ముఖంపై నీళ్లు చల్లాలి','కదలించకుండా వదిలేయాలి',2,'స్పందన మరియు శ్వాస ఆడుతుందో లేదో చెక్ చేయాలి','పేషెంట్ స్పందిస్తున్నాడా లేదా (Responsiveness) మరియు శ్వాస తీసుకుంటున్నాడా అనేది ముందుగా చెక్ చేయాలి.','ollama','2026-08-14 17:55:00'),(287,'12','Patient care & Diagnostics','Telugu','easy','శ్వాస తీసుకోవడంలో ఇబ్బంది పడుతున్న పేషెంట్ ను ఏ పొజిషన్ లో ఉంచడం ఉత్తమం?','బోర్లా పడుకోబెట్టాలి','తలకిందులుగా ఉంచాలి','కూర్చోబెట్టాలి లేదా ఎత్తుగా ఆనించి ఉంచాలి (Fowler\'s Position)','కాళ్లు పైకి ఎత్తాలి',3,'కూర్చోబెట్టాలి లేదా ఎత్తుగా ఆనించి ఉంచాలి (Fowler\'s Position)','ఈ పొజిషన్ లో ఊపిరితిత్తులు పూర్తిగా వ్యాకోచించడానికి మరియు శ్వాస సులభంగా తీసుకోవడానికి వీలు కలుగుతుంది.','ollama','2026-08-14 17:55:00'),(288,'12','Patient care & Diagnostics','Telugu','easy','ఆసుపత్రులలో ICU అనగా ఏమిటి?','ఇంటర్నల్ కేర్ యూనిట్','ఇంటెన్సివ్ కేర్ యూనిట్ (Intensive Care Unit)','ఇమీడియట్ కేర్ యూనిట్','ఇన్ఫెక్షన్ కేర్ యూనిట్',2,'ఇంటెన్సివ్ కేర్ యూనిట్ (Intensive Care Unit)','క్లిష్ట పరిస్థితిలో ఉన్న రోగులకు నిరంతర పర్యవేక్షణ కోసం ICU లో ఉంచుతారు.','ollama','2026-08-14 17:55:00'),(289,'12','Patient care & Diagnostics','Telugu','easy','CPR చేసేటప్పుడు చేతులను ఛాతీపై ఎక్కడ ఉంచి ఒత్తిడి (Chest Compressions) చేయాలి?','కడుపు మీద','ఛాతీ మధ్యలో (బ్రెస్ట్ బోన్ కింద భాగంలో)','గొంతు కింద','ఎడమ వైపు గుండె మీద పక్కగా',2,'ఛాతీ మధ్యలో (బ్రెస్ట్ బోన్ కింద భాగంలో)','ఛాతీ మధ్యలో (స్టెర్నమ్ పై) కుదింపులు చేయడం ద్వారా గుండె నుండి రక్తం పంప్ అవుతుంది.','ollama','2026-08-14 17:55:00'),(290,'12','Patient care & Diagnostics','Telugu','easy','రక్తంలో ఆక్సిజన్ స్థాయిని (SpO2) కొలవడానికి ఏ పరికరాన్ని ఉపయోగిస్తారు?','పల్స్ ఆక్సిమీటర్ (Pulse Oximeter)','గ్లూకోమీటర్','థర్మామీటర్','వెంటిలేటర్',1,'పల్స్ ఆక్సిమీటర్ (Pulse Oximeter)','వేలికి క్లిప్ లాగా పెట్టి ఆక్సిజన్ సాచురేషన్ ను కొలవడానికి పల్స్ ఆక్సిమీటర్ వాడతారు.','ollama','2026-08-14 17:55:00'),(291,'12','Patient care & Diagnostics','Telugu','medium','అత్యవసర సమయంలో స్పృహలేని వయోజనులలో నాడి (Pulse) చెక్ చేయడానికి ఏ ప్రదేశం ఉత్తమమైనది?','మణికట్టు (Radial artery)','మెడ దగ్గర (Carotid artery)','కాలు దగ్గర (Pedal artery)','గుండె పైన',2,'మెడ దగ్గర (Carotid artery)','కార్డియాక్ అరెస్ట్ సమయంలో రక్తపోటు పడిపోయినా, కెరోటిడ్ పల్స్ ని స్పష్టంగా తెలుసుకోవచ్చు.','ollama','2026-08-14 17:55:00'),(292,'12','Patient care & Diagnostics','Telugu','medium','కార్డియాక్ అరెస్ట్ అయిన పేషెంట్ కు AED పరికరాన్ని ఎందుకు ఉపయోగిస్తారు?','ఊపిరితిత్తుల్లో గాలి నింపడానికి','గుండెకు విద్యుత్ షాక్ ఇచ్చి సాధారణ లయను తిరిగి తీసుకురావడానికి','బ్లడ్ ప్రెషర్ కొలవడానికి','మందులు ఎక్కించడానికి',2,'గుండెకు విద్యుత్ షాక్ ఇచ్చి సాధారణ లయను తిరిగి తీసుకురావడానికి','Automated External Defibrillator గుండె లయ తప్పినప్పుడు షాక్ ఇచ్చి దాన్ని సెట్ చేస్తుంది.','ollama','2026-08-14 17:55:00'),(293,'12','Patient care & Diagnostics','Telugu','medium','టాకీకార్డియా (Tachycardia) అనగా వైద్య పరిభాషలో అర్థం ఏమిటి?','గుండె కొట్టుకోవడం ఆగిపోవడం','పల్స్ రేట్ చాలా తక్కువగా ఉండటం','గుండె అతి వేగంగా కొట్టుకోవడం (నిమిషానికి 100 పైగా)','బ్లడ్ ప్రెషర్ పడిపోవడం',3,'గుండె అతి వేగంగా కొట్టుకోవడం (నిమిషానికి 100 పైగా)','Heart rate పెరగడాన్ని టాకీకార్డియా అంటారు (Tachy అంటే వేగంగా).','ollama','2026-08-14 17:55:00'),(294,'12','Patient care & Diagnostics','Telugu','medium','కార్డియాక్ లైఫ్ సపోర్ట్ లో, వయోజనులకు CPR చేసేటప్పుడు ఛాతీ కుదింపులు (Compressions) మరియు శ్వాసల (Breaths) నిష్పత్తి ఎంత ఉండాలి?','15:2','30:2','40:2','50:2',2,'30:2','ప్రపంచ ఆరోగ్య మార్గదర్శకాల (AHA) ప్రకారం 30 కంప్రెషన్స్ తర్వాత 2 శ్వాసలు ఇవ్వాలి.','ollama','2026-08-14 17:55:00'),(295,'12','Patient care & Diagnostics','Telugu','medium','ఒక రోగికి హైపోగ్లైసీమియా (Hypoglycemia) వచ్చినప్పుడు శరీరంలో దేని స్థాయి పడిపోతుంది?','ఆక్సిజన్','రక్తం (హేమోగ్లోబిన్)','బ్లడ్ షుగర్ (చక్కెర స్థాయి)','క్యాల్షియం',3,'బ్లడ్ షుగర్ (చక్కెర స్థాయి)','Hypo అంటే తక్కువ, Glycemia అంటే గ్లూకోజ్ (చక్కెర). ఇది డయాబెటిస్ పేషెంట్లలో ఎక్కువగా వస్తుంది.','ollama','2026-08-14 17:55:00'),(296,'12','Patient care & Diagnostics','Telugu','hard','అడ్వాన్స్డ్ కార్డియాక్ లైఫ్ సపోర్ట్ (ACLS) లో, గుండె ఆగిపోయిన (Cardiac Arrest) పేషెంట్ కి మొదటగా ఇచ్చే అత్యవసర మందు (Drug) ఏది?','ఆస్పిరిన్ (Aspirin)','ఎపినెఫ్రిన్ (Epinephrine / Adrenaline)','ఇన్సులిన్ (Insulin)','పారాసెటమాల్',2,'ఎపినెఫ్రిన్ (Epinephrine / Adrenaline)','ఎపినెఫ్రిన్ రక్తనాళాలను కుదించి, గుండె మరియు మెదడుకు రక్త ప్రసరణను పెంచుతుంది.','ollama','2026-08-14 17:55:00'),(297,'12','Patient care & Diagnostics','Telugu','hard','గుండెపోటు (Myocardial Infarction) వచ్చినప్పుడు గుండె కండరాలకు డ్యామేజ్ జరిగిందో లేదో నిర్ధారించడానికి చేసే నిర్దిష్టమైన రక్త పరీక్ష (Biomarker Test) ఏది?','లిపిడ్ ప్రొఫైల్','హిమోగ్లోబిన్','ట్రోపోనిన్ (Troponin)','థైరాయిడ్ ప్యానెల్',3,'ట్రోపోనిన్ (Troponin)','గుండె కండరాలకు నష్టం జరిగినప్పుడు ట్రోపోనిన్ అనే ప్రోటీన్ రక్తంలోకి విడుదల అవుతుంది.','ollama','2026-08-14 17:55:00'),(298,'12','Patient care & Diagnostics','Telugu','hard','అనాఫిలాక్సిస్ (Anaphylaxis) అనబడే తీవ్రమైన అలెర్జిక్ రియాక్షన్ లో శ్వాసనాళాలు మూసుకుపోయి ప్రాణాపాయం ఏర్పడినప్పుడు వెంటనే వాడాల్సిన మందు ఏది?','ఎపినెఫ్రిన్ ఇంజెక్షన్ (Epinephrine IM)','యాంటీబయోటిక్స్','సెలైన్ వాటర్','పెయిన్ కిల్లర్స్',1,'ఎపినెఫ్రిన్ ఇంజెక్షన్ (Epinephrine IM)','ఇది శ్వాసనాళాల వాపును తగ్గించి తక్షణమే శ్వాస ఆడేలా చేస్తుంది.','ollama','2026-08-14 17:55:00'),(299,'12','Patient care & Diagnostics','Telugu','hard','బేసిక్ లైఫ్ సపోర్ట్ (BLS) ప్రోటోకాల్ ప్రకారం CPR చేసేటప్పుడు పాటించాల్సిన పద్ధతి CAB అనగా ఏమిటి?','సర్క్యులేషన్ (Circulation), ఆక్సిజన్ (Oxygen), బ్రీతింగ్ (Breathing)','కంప్రెషన్స్ (Compressions), ఎయిర్ వే (Airway), బ్రీతింగ్ (Breathing)','కార్డియాక్, ఆర్టరీ, బ్లడ్','చెస్ట్, అబ్డొమెన్, బ్రెయిన్',2,'కంప్రెషన్స్ (Compressions), ఎయిర్ వే (Airway), బ్రీతింగ్ (Breathing)','మొదట ఛాతీ కుదింపులు (C) చేయాలి, తర్వాత వాయుమార్గం (A) తెరవాలి, చివరగా శ్వాస (B) అందించాలి.','ollama','2026-08-14 17:55:00'),(300,'12','Patient care & Diagnostics','Telugu','hard','V-Fib (Ventricular Fibrillation) అనే ప్రాణాంతకమైన గుండె లయ (Rhythm) ఏర్పడినప్పుడు ఏకైక మరియు అత్యంత ప్రభావవంతమైన చికిత్స ఏది?','కేవలం మందులు ఇవ్వడం','డీఫిబ్రిలేషన్ (Defibrillation - Shock ఇవ్వడం)','పేషెంట్ ని బోర్లా పడుకోబెట్టడం','మంచి నీళ్ళు తాగించడం',2,'డీఫిబ్రిలేషన్ (Defibrillation - Shock ఇవ్వడం)','V-Fib సమయంలో గుండె వణుకుతుంది కానీ రక్తాన్ని పంప్ చేయదు. షాక్ ఇవ్వడం (Defibrillation) ద్వారానే గుండెను సెట్ చేయగలం.','ollama','2026-08-14 17:55:00'),(301,'13','Software, 3D & DevOps','Tamil','easy','மென்பொருள் உருவாக்கத்தில் (Software Development) \'Git\' எதற்காக முக்கியமாகப் பயன்படுத்தப்படுகிறது?','மூலக் குறியீடு மேலாண்மை (Source Code Management)','வீடியோ எடிட்டிங் (Video Editing)','3D டிசைன் (3D Design)','தரவுத்தளம் (Database)',1,'மூலக் குறியீடு மேலாண்மை (Source Code Management)','பல டெவலப்பர்கள் இணைந்து வேலை செய்யும் போது குறியீட்டின் மாற்றங்களை கண்காணிக்க Git பயன்படுகிறது.','ollama','2026-08-14 18:00:00'),(302,'13','Software, 3D & DevOps','Tamil','easy','இலவசமாகக் கிடைக்கும் (Open-source) பிரபலமான 3D மாடலிங் மென்பொருள் எது?','MS Word','Photoshop','Excel','Blender (பிளெண்டர்)',4,'Blender (பிளெண்டர்)','பிளெண்டர் என்பது 3D அனிமேஷன், மாடலிங் மற்றும் கேம் வடிவமைப்பிற்குப் பயன்படும் இலவச மென்பொருளாகும்.','ollama','2026-08-14 18:00:00'),(303,'13','Software, 3D & DevOps','Tamil','easy','DevOps-ல் CI/CD என்பதன் விரிவாக்கம் என்ன?','Continuous Input / Continuous Data','Continuous Integration / Continuous Deployment','Code Integration / Code Design','Core Integration / Core Deployment',2,'Continuous Integration / Continuous Deployment','மென்பொருளை தானியக்கமாக டெஸ்ட் செய்து (CI) வெளியிடுவதை (CD) இது குறிக்கிறது.','ollama','2026-08-14 18:00:00'),(304,'13','Software, 3D & DevOps','Tamil','easy','ப்ரோக்ராமிங்கில் (Programming-ல்) \"Bug\" (பக்) என்றால் என்ன?','வைரஸ்','கணினி வன்பொருள் (Hardware)','குறியீட்டில் உள்ள பிழை (Error in the code)','இணையதளம்',3,'குறியீட்டில் உள்ள பிழை (Error in the code)','ஒரு மென்பொருள் சரியாக இயங்காமல் போவதற்குக் காரணமான தவறை பக் (Bug) என்று கூறுவர்.','ollama','2026-08-14 18:00:00'),(305,'13','Software, 3D & DevOps','Tamil','easy','3D மாடலிங்கில் \"Polygon\" (பாலிகன்) என்றால் என்ன?','தட்டையான மேற்பரப்பு (Flat surface)','நிறம்','வெளிச்சம் (Lighting)','கேமரா',1,'தட்டையான மேற்பரப்பு (Flat surface)','3D உருவங்கள் பல பாலிகன்கள் (முக்கோணம், செவ்வகம்) சேர்ந்தே உருவாக்கப்படுகின்றன.','ollama','2026-08-14 18:00:00'),(306,'13','Software, 3D & DevOps','Tamil','easy','கண்டெய்னரைசேஷனுக்கு (Containerization) அதிகமாகப் பயன்படுத்தப்படும் கருவி (Tool) எது?','Paint','Jenkins','Docker (டாக்கர்)','Android',3,'Docker (டாக்கர்)','மென்பொருளை எங்கு வேண்டுமானாலும் எளிதாக இயக்க டாக்கர் (Docker) கண்டெய்னர்கள் பயன்படுகின்றன.','ollama','2026-08-14 18:00:00'),(307,'13','Software, 3D & DevOps','Tamil','easy','API என்பதன் முழு வடிவம் என்ன?','Active Process Internet','Application Programming Interface','Auto Program Interface','Application Public Internet',2,'Application Programming Interface','இரண்டு மென்பொருள்கள் தங்களுக்குள் தகவல்களைப் பரிமாறிக்கொள்ள API உதவுகிறது.','ollama','2026-08-14 18:00:00'),(308,'13','Software, 3D & DevOps','Tamil','easy','3D மாடலுக்கு நிறம் மற்றும் தோற்றத்தை (Appearance) வழங்குவதை எவ்வாறு அழைப்பார்கள்?','Rigging','Animation','Lighting','Texturing (டெக்ஸ்ச்சரிங்)',4,'Texturing (டெக்ஸ்ச்சரிங்)','மாடலின் மேல் தோல், மரம், இரும்பு போன்ற தோற்றங்களைச் சேர்ப்பது Texturing எனப்படும்.','ollama','2026-08-14 18:00:00'),(309,'13','Software, 3D & DevOps','Tamil','easy','சர்வர் (Server) என்றால் என்ன?','பிற கணினிகளுக்கு தரவு/சேவைகளை வழங்கும் கணினி','ஒரு வகையான மொபைல்','பிரிண்டர் கருவி','இணையதளம்',1,'பிற கணினிகளுக்கு தரவு/சேவைகளை வழங்கும் கணினி','இணையதளங்கள் மற்றும் செயலிகளுக்குத் தேவையான தரவுகளை சர்வர் வழங்கிச் செயல்படுத்துகிறது.','ollama','2026-08-14 18:00:00'),(310,'13','Software, 3D & DevOps','Tamil','easy','HTML எதற்காகப் பயன்படுத்தப்படுகிறது?','3D கேம்கள் உருவாக்க','வலைப்பக்கங்களை (Web pages) உருவாக்க','தரவுத்தளத்தை (Database) நிர்வகிக்க','வீடியோ எடிட்டிங் செய்ய',2,'வலைப்பக்கங்களை (Web pages) உருவாக்க','வலைப்பக்கங்களின் கட்டமைப்பை (Structure) உருவாக்க HTML மொழியே அடிப்படை.','ollama','2026-08-14 18:00:00'),(311,'13','Software, 3D & DevOps','Tamil','medium','அஜைல் (Agile) மென்பொருள் உருவாக்கத்தில் \"Sprint\" (ஸ்ப்ரிண்ட்) என்றால் என்ன?','வேகமாக தட்டச்சு செய்வது','பிழைகளை நீக்குவது','குறிப்பிட்ட வேலையை முடிக்க நிர்ணயிக்கப்பட்ட குறுகிய காலம் (1-4 வாரங்கள்)','மென்பொருளை விற்பது',3,'குறிப்பிட்ட வேலையை முடிக்க நிர்ணயிக்கப்பட்ட குறுகிய காலம் (1-4 வாரங்கள்)','Agile முறையில் பணிகளைச் சிறிய சிறிய Sprint-களாகப் பிரித்துச் செய்வார்கள்.','ollama','2026-08-14 18:00:00'),(312,'13','Software, 3D & DevOps','Tamil','medium','DevOps-ல் \"Jenkins\" (ஜென்கின்ஸ்) கருவியின் முக்கிய பங்கு என்ன?','CI/CD பைப்லைனை தானியக்கமாக்குதல் (Automating CI/CD Pipeline)','3D மாடலிங் செய்தல்','குறியீட்டை எழுதுதல்','தரவுத்தளத்தை உருவாக்குதல்',1,'CI/CD பைப்லைனை தானியக்கமாக்குதல் (Automating CI/CD Pipeline)','ஜென்கின்ஸ் என்பது குறியீட்டை பில்ட் (Build) மற்றும் டெஸ்ட் செய்வதைத் தானாகச் செய்ய உதவும் கருவி.','ollama','2026-08-14 18:00:00'),(313,'13','Software, 3D & DevOps','Tamil','medium','3D கிராபிக்ஸில் \"Rendering\" (ரெண்டரிங்) என்றால் என்ன?','மாடலை நீக்குவது','3D காட்சியில் இருந்து இறுதி 2D படம் அல்லது அனிமேஷனை உருவாக்குவது','ஒலியை சேர்ப்பது','நிறத்தை மாற்றுவது',2,'3D காட்சியில் இருந்து இறுதி 2D படம் அல்லது அனிமேஷனை உருவாக்குவது','ஒளி, நிழல் என அனைத்தையும் கணக்கிட்டு இறுதி அவுட்புட்டை (Output) தருவது Rendering ஆகும்.','ollama','2026-08-14 18:00:00'),(314,'13','Software, 3D & DevOps','Tamil','medium','\"Infrastructure as Code\" (IaC) முறையைச் செயல்படுத்தப் பயன்படும் பிரபலமான கருவி எது?','Photoshop','React','MySQL','Terraform (டெர்ராஃபார்ம்)',4,'Terraform (டெர்ராஃபார்ம்)','சர்வர்களை மனிதர்கள் உருவாக்குவதற்குப் பதிலாக, குறியீடுகள் (Code) மூலம் தானாக உருவாக்க Terraform பயன்படுகிறது.','ollama','2026-08-14 18:00:00'),(315,'13','Software, 3D & DevOps','Tamil','medium','3D மாடலிங்கில் \"Rigging\" (ரிகிங்) என்றால் என்ன?','அனிமேஷன் செய்வதற்காக 3D மாடலுக்கு எலும்புக்கூடு (Skeleton) அமைப்பைச் சேர்ப்பது','வெளிச்சம் அமைப்பது','வீடியோ பதிவு செய்வது','கோப்பை சேமிப்பது',1,'அனிமேஷன் செய்வதற்காக 3D மாடலுக்கு எலும்புக்கூடு (Skeleton) அமைப்பைச் சேர்ப்பது','கதாபாத்திரங்களை அசைக்க (Animate) ரிகிங் செய்வது மிக முக்கியம்.','ollama','2026-08-14 18:00:00'),(316,'13','Software, 3D & DevOps','Tamil','hard','\"Kubernetes\" (குபெர்னெட்ஸ்) என்பதன் முதன்மை செயல்பாடு என்ன?','இணையதள வடிவமைப்பு','கண்டெய்னர் ஆர்கெஸ்ட்ரேஷன் மற்றும் ஸ்கேலிங் (Container Orchestration and Scaling)','3D அனிமேஷன்','வைரஸ் நீக்கம்',2,'கண்டெய்னர் ஆர்கெஸ்ட்ரேஷன் மற்றும் ஸ்கேலிங் (Container Orchestration and Scaling)','ஆயிரக்கணக்கான Docker கண்டெய்னர்களை நிர்வகிக்கவும், தேவைக்கேற்ப தானாகக் கூட்டவும்/குறைக்கவும் இது பயன்படுகிறது.','ollama','2026-08-14 18:00:00'),(317,'13','Software, 3D & DevOps','Tamil','hard','3D மாடலிங்கில் \"UV Mapping\" (UV மேப்பிங்) என்றால் என்ன?','கேமரா கோணத்தை மாற்றுவது','மாடலின் அளவை குறைப்பது','ஒரு 2D படத்தை (Texture) 3D மாடலின் மேற்பரப்பில் சரியாகப் பொருத்துவது','நிழல்களை உருவாக்குவது',3,'ஒரு 2D படத்தை (Texture) 3D மாடலின் மேற்பரப்பில் சரியாகப் பொருத்துவது','ஒரு 3D பொருளின் மேற்புறத்தைத் தட்டையாக விரித்து அதில் நிறம் அல்லது படங்களைச் சேர்ப்பதே UV Mapping.','ollama','2026-08-14 18:00:00'),(318,'13','Software, 3D & DevOps','Tamil','hard','\"Microservices\" (மைக்ரோசர்வீசஸ்) ஆர்கிடெக்சர் என்றால் என்ன?','ஒரு பெரிய மென்பொருளைப் பல சிறிய, தனித்துவமான சேவைகளாகப் பிரித்து உருவாக்குதல்','மிகச்சிறிய கணினிகளை பயன்படுத்துதல்','மைக்ரோசாப்ட் சேவைகளை வாங்குதல்','ஒரே ஒரு சர்வரில் அனைத்தையும் சேமித்தல்',1,'ஒரு பெரிய மென்பொருளைப் பல சிறிய, தனித்துவமான சேவைகளாகப் பிரித்து உருவாக்குதல்','ஒவ்வொரு சேவையும் தனித்தனியாக இயங்குவதால் (உதாரணம்: Payment தனியாக, Login தனியாக), இதனைப் பராமரிப்பது எளிது.','ollama','2026-08-14 18:00:00'),(319,'13','Software, 3D & DevOps','Tamil','hard','சாப்ட்வேர் வெளியீட்டில் (Deployment) \"Blue-Green Deployment\" என்றால் என்ன?','குறியீட்டிற்கு நீல மற்றும் பச்சை நிறம் கொடுப்பது','பயனர்களுக்கு இரண்டு செயலிகளை வழங்குவது','பிழைகளைத் தானாக சரிசெய்வது','பழைய மற்றும் புதிய வெர்ஷன்களை ஒரே நேரத்தில் நிர்வகித்து டவுன்டைம் (Downtime) இல்லாமல் வெளியிடுவது',4,'பழைய மற்றும் புதிய வெர்ஷன்களை ஒரே நேரத்தில் நிர்வகித்து டவுன்டைம் (Downtime) இல்லாமல் வெளியிடுவது','பழையது (Blue) ஓடிக்கொண்டிருக்கும் போதே புதியதை (Green) டெஸ்ட் செய்து, தடங்கலின்றி பயனர்களை மாற்றுவதே இது.','ollama','2026-08-14 18:00:00'),(320,'13','Software, 3D & DevOps','Tamil','hard','3D மாடலிங்கில் \"Baking\" (பேக்கிங்) என்றால் என்ன?','மாடலை சூடாக்குவது','வெளிச்சம், நிழல் போன்ற தகவல்களை முன்கூட்டியே கணக்கிட்டு ஒரு டெக்ஸ்ச்சர் (Texture) கோப்பாகச் சேமிப்பது','3D பிரின்டிங் செய்வது','மாடலை அழிப்பது',2,'வெளிச்சம், நிழல் போன்ற தகவல்களை முன்கூட்டியே கணக்கிட்டு ஒரு டெக்ஸ்ச்சர் (Texture) கோப்பாகச் சேமிப்பது','இதன் மூலம் கேம்களை விளையாடும் போது கணினி வேகமாகச் செயல்பட முடியும் (Performance Optimization).','ollama','2026-08-14 18:00:00');
/*!40000 ALTER TABLE `exam_questions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `needer_request_notify`
--

DROP TABLE IF EXISTS `needer_request_notify`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `needer_request_notify` (
  `id` int NOT NULL AUTO_INCREMENT,
  `needer_id` int NOT NULL,
  `donor_id` int NOT NULL,
  `isdonor_response` tinyint DEFAULT '0',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_needer_request_notify_needer_id` (`needer_id`),
  KEY `fk_needer_request_notify_donor_id` (`donor_id`),
  CONSTRAINT `fk_needer_request_notify_donor_id` FOREIGN KEY (`donor_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_needer_request_notify_needer_id` FOREIGN KEY (`needer_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `needer_request_notify`
--

LOCK TABLES `needer_request_notify` WRITE;
/*!40000 ALTER TABLE `needer_request_notify` DISABLE KEYS */;
/*!40000 ALTER TABLE `needer_request_notify` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `networks`
--

DROP TABLE IF EXISTS `networks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `networks` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `profile_id` int NOT NULL,
  `get_in_touch` tinyint DEFAULT NULL,
  `feedback_star` int DEFAULT NULL,
  `feedback` varchar(500) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_active_connection` (`user_id`,`profile_id`),
  KEY `fk_networks_profile` (`profile_id`),
  CONSTRAINT `fk_networks_profile` FOREIGN KEY (`profile_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_networks_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `networks`
--

LOCK TABLES `networks` WRITE;
/*!40000 ALTER TABLE `networks` DISABLE KEYS */;
INSERT INTO `networks` VALUES (1,1,6,1,NULL,NULL,'2026-08-13 13:02:13','2026-08-13 13:04:09'),(3,1,3,0,NULL,NULL,'2026-08-13 13:14:28','2026-08-13 13:15:57'),(5,1,2,0,NULL,NULL,'2026-08-13 13:07:33','2026-08-13 13:14:54'),(6,3,2,NULL,NULL,NULL,'2026-08-13 13:22:40','2026-08-13 13:22:40'),(7,3,1,1,NULL,NULL,'2026-08-13 13:46:12','2026-08-14 11:19:28');
/*!40000 ALTER TABLE `networks` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `post_response`
--

DROP TABLE IF EXISTS `post_response`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `post_response` (
  `id` int NOT NULL AUTO_INCREMENT,
  `post_id` int NOT NULL,
  `post_like` json DEFAULT NULL COMMENT 'Array of user_ids who liked',
  `comments` json DEFAULT NULL COMMENT 'Array of {user_id, author_name, content_html, created_at}',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `post_save` json DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_post` (`post_id`),
  CONSTRAINT `fk_post_response_post` FOREIGN KEY (`post_id`) REFERENCES `posts` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `post_response`
--

LOCK TABLES `post_response` WRITE;
/*!40000 ALTER TABLE `post_response` DISABLE KEYS */;
INSERT INTO `post_response` VALUES (1,1,'[]','[]','2026-08-14 14:33:19','2026-08-14 14:33:19','[]'),(2,2,'[]','[]','2026-08-14 15:33:44','2026-08-14 15:33:44','[]'),(3,3,'[]','[]','2026-08-14 15:39:41','2026-08-14 15:39:41','[]'),(4,4,'[]','[]','2026-08-14 15:48:12','2026-08-14 15:48:12','[]'),(5,5,'[]','[]','2026-08-14 16:09:45','2026-08-14 16:09:45','[]'),(6,6,'[]','[]','2026-08-14 16:17:31','2026-08-14 16:17:31','[]');
/*!40000 ALTER TABLE `post_response` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `posts`
--

DROP TABLE IF EXISTS `posts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `posts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `title` varchar(255) DEFAULT NULL,
  `content` text,
  `context_type` varchar(100) DEFAULT NULL,
  `tags` json DEFAULT NULL,
  `media_path` varchar(500) DEFAULT NULL,
  `media_type` enum('image','video','audio','document','none') DEFAULT 'none',
  `media_original_name` varchar(255) DEFAULT NULL,
  `country` varchar(100) DEFAULT NULL,
  `state` varchar(100) DEFAULT NULL,
  `is_nearby` tinyint(1) DEFAULT '0',
  `appreciations` int DEFAULT '0',
  `comments_count` int DEFAULT '0',
  `collaborations` int DEFAULT '0',
  `is_delete` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_posts_user` (`user_id`),
  CONSTRAINT `fk_posts_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `posts`
--

LOCK TABLES `posts` WRITE;
/*!40000 ALTER TABLE `posts` DISABLE KEYS */;
INSERT INTO `posts` VALUES (1,1,'Situation awareness','<div>need to know in realtime situation everyone need to know&nbsp;</div>','Awareness','[\"Awareness\"]','uploads/posts/post-1786717999141-656160408.jpg','image','1000049469.jpg',NULL,NULL,0,0,0,0,0,'2026-08-14 14:33:19','2026-08-14 14:33:19'),(2,1,'Cancer and drug awareness','<div>Today they conducted a event for the awareness of both cancer and drug many people are inspired on this event and they conducted other existing events&nbsp;</div>','Awareness','[\"Awareness\"]','uploads/posts/post-1786721623646-864101585.mp4','video','1000049496.mp4',NULL,NULL,0,0,0,0,0,'2026-08-14 15:33:44','2026-08-14 15:33:44'),(3,1,'Full stack developer','<div><span style=\"font-size: 15px;\">Over the past two years as a Full Stack Developer, I\'ve built and deployed end-to-end applications using Python, MySQL, HTML, CSS, and JavaScript. From participating in competitive hackathons to developing AI-integrated concepts, I\'ve focused on creating scalable backend databases and intuitive frontend experiences. I\'m excited to leverage this hands-on experience to tackle new challenges and drive innovative tech solutions</span></div><div><span style=\"font-size: 15px;\"><br></span></div><div><span style=\"font-size: 15px;\">Now anounce to start a career guidance and a mentorship program to get more details follow me in wehere</span></div>','Career guidance and improvement','[\"Career guidance and improvement\"]',NULL,'none',NULL,NULL,NULL,0,0,0,0,0,'2026-08-14 15:39:41','2026-08-14 15:39:41'),(4,2,'Disaster preparedness','<div>An informational poster outlining four crucial pillars of disaster readiness: Develop a Plan, Emergency Supplies, Stay Informed, and Communication. Each section provides a brief actionable summary and is accompanied by a circular icon depicting different natural hazards like tornadoes, floods, earthquakes, and volcanic eruptions.</div>','Awareness','[\"Awareness\"]','uploads/posts/post-1786722492333-80300144.jpg','image','1000049498.jpg',NULL,NULL,0,0,0,0,0,'2026-08-14 15:48:12','2026-08-14 15:48:12'),(5,3,'Political support','<div>Hyderabad government introduced the 1000 ambulance service in van with all expected features, requirements on the van itself&nbsp;</div><div>&nbsp;I supported with full guidance and improvement among with them learned some kindness from the all supported employees looking forwards to do more in that field and continue on my career guidance events&nbsp;</div>','Support','[\"Support\"]','uploads/posts/post-1786723785684-925781298.mp4','video','1000049505.mp4',NULL,NULL,0,0,0,0,0,'2026-08-14 16:09:45','2026-08-14 16:09:45'),(6,3,'Earthquake preparedness','<div>conducting a workshop on next week which is important to attend for all citizens of the india to aware of earthquake and preparation about the earthquake. Get a full experience inthe earthquake preparedness it helps for the emergency situation&nbsp;</div><div><br></div><div>interested volenteers and users can register or come join us further more details follow me wehere app&nbsp;</div>','Career guidance and improvement','[\"Career guidance and improvement\"]','uploads/posts/post-1786724251513-37590767.jpg','image','1000049506.jpg',NULL,NULL,0,0,0,0,0,'2026-08-14 16:17:31','2026-08-14 16:17:31');
/*!40000 ALTER TABLE `posts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `response_status`
--

DROP TABLE IF EXISTS `response_status`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `response_status` (
  `id` int NOT NULL,
  `response_name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `response_status`
--

LOCK TABLES `response_status` WRITE;
/*!40000 ALTER TABLE `response_status` DISABLE KEYS */;
INSERT INTO `response_status` VALUES (0,'Pending'),(1,'Responded / Accepted'),(2,'Not Responded / Declined'),(3,'Completed');
/*!40000 ALTER TABLE `response_status` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sos_ambulance_alert`
--

DROP TABLE IF EXISTS `sos_ambulance_alert`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sos_ambulance_alert` (
  `id` int NOT NULL AUTO_INCREMENT,
  `alert_sender` int NOT NULL,
  `alert_sender_location` json NOT NULL COMMENT '{"latitude": number, "longitude": number, "location_name": string}',
  `alert_receivers` json NOT NULL COMMENT '[{ "user_id": number, "latitude": number, "longitude": number, "location_name": string }]',
  `alert_status` tinyint NOT NULL DEFAULT '1' COMMENT '1 = active, 0 = cleared/expired',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `received_status` json DEFAULT NULL COMMENT 'Array of { "user_id": number, "received_status": 0|1 }. Default 0 = not received, 1 = received/cleared',
  PRIMARY KEY (`id`),
  KEY `fk_alert_sender` (`alert_sender`),
  CONSTRAINT `fk_alert_sender` FOREIGN KEY (`alert_sender`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=24 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sos_ambulance_alert`
--

LOCK TABLES `sos_ambulance_alert` WRITE;
/*!40000 ALTER TABLE `sos_ambulance_alert` DISABLE KEYS */;
INSERT INTO `sos_ambulance_alert` VALUES (1,1,'{\"latitude\": 11.1527833, \"longitude\": 76.9482823, \"location_name\": \"25C/2, Periyanaickenpalayam\"}','[{\"role\": null, \"user_id\": 2, \"latitude\": 11.1531819, \"full_name\": null, \"longitude\": 76.9478988, \"distance_km\": 0.06, \"location_name\": \"25C/1, Periyanaickenpalayam, Periyanaickenpalayam, Tamil Nadu, India, (641020)\", \"mobile_number\": \"+919942883596\"}]',1,'2026-08-09 07:11:23','2026-08-09 07:52:34','[{\"status\": 1, \"user_id\": 2, \"received_at\": \"2026-08-09T07:52:34.627Z\"}]'),(2,1,'{\"latitude\": 11.1531822, \"longitude\": 76.9478991, \"location_name\": \"25C/1, Periyanaickenpalayam\"}','[{\"role\": null, \"user_id\": 2, \"latitude\": 11.1531819, \"full_name\": null, \"longitude\": 76.9478988, \"distance_km\": 0, \"location_name\": \"25C/1, Periyanaickenpalayam, Periyanaickenpalayam, Tamil Nadu, India, (641020)\", \"mobile_number\": \"+919942883596\"}]',1,'2026-08-09 07:22:39','2026-08-09 07:54:40','[{\"status\": 1, \"user_id\": 2, \"received_at\": \"2026-08-09T07:46:52.313Z\"}]'),(3,2,'{\"latitude\": 11.1531837, \"longitude\": 76.9478997, \"location_name\": \"25C/1, Periyanaickenpalayam\"}','[{\"role\": \"Mentor,volunteer\", \"user_id\": 1, \"latitude\": 11.1531814, \"full_name\": \"Sanjay R\", \"longitude\": 76.9478982, \"distance_km\": 0, \"location_name\": \"25C/1, Periyanaickenpalayam, Periyanaickenpalayam, Tamil Nadu, India, (641020)\", \"mobile_number\": \"+919942883595\"}, {\"role\": null, \"user_id\": 3, \"latitude\": 11.1531814, \"full_name\": null, \"longitude\": 76.9478983, \"distance_km\": 0, \"location_name\": \"25C/1, Periyanaickenpalayam, Periyanaickenpalayam, Tamil Nadu, India, (641020)\", \"mobile_number\": \"+919942883597\"}]',1,'2026-08-09 07:54:09','2026-08-09 08:02:52','[{\"status\": 1, \"user_id\": 1, \"received_at\": \"2026-08-09T08:02:52.914Z\"}, {\"status\": 0, \"user_id\": 3}]'),(4,1,'{\"latitude\": 11.1531834, \"longitude\": 76.9478996, \"location_name\": \"25C/1, Periyanaickenpalayam\"}','[{\"role\": null, \"user_id\": 2, \"latitude\": 11.1531816, \"full_name\": null, \"longitude\": 76.9478982, \"distance_km\": 0, \"location_name\": \"25C/1, Periyanaickenpalayam, Periyanaickenpalayam, Tamil Nadu, India, (641020)\", \"mobile_number\": \"+919942883596\"}, {\"role\": null, \"user_id\": 3, \"latitude\": 11.153183, \"full_name\": null, \"longitude\": 76.9478995, \"distance_km\": 0, \"location_name\": \"25C/1, Periyanaickenpalayam, Periyanaickenpalayam, Tamil Nadu, India, (641020)\", \"mobile_number\": \"+919942883597\"}]',1,'2026-08-09 08:03:08','2026-08-09 08:03:44','[{\"status\": 1, \"user_id\": 2, \"received_at\": \"2026-08-09T08:03:44.398Z\"}, {\"status\": 0, \"user_id\": 3}]'),(5,1,'{\"latitude\": 11.1531823, \"longitude\": 76.9478988, \"location_name\": \"25C/1, Periyanaickenpalayam\"}','[{\"role\": null, \"user_id\": 2, \"latitude\": 11.1531816, \"full_name\": null, \"longitude\": 76.9478982, \"distance_km\": 0, \"location_name\": \"25C/1, Periyanaickenpalayam, Periyanaickenpalayam, Tamil Nadu, India, (641020)\", \"mobile_number\": \"+919942883596\"}, {\"role\": null, \"user_id\": 3, \"latitude\": 11.153183, \"full_name\": null, \"longitude\": 76.9478995, \"distance_km\": 0, \"location_name\": \"25C/1, Periyanaickenpalayam, Periyanaickenpalayam, Tamil Nadu, India, (641020)\", \"mobile_number\": \"+919942883597\"}]',1,'2026-08-09 08:03:14','2026-08-09 08:03:51','[{\"status\": 1, \"user_id\": 2, \"received_at\": \"2026-08-09T08:03:51.166Z\"}, {\"status\": 0, \"user_id\": 3}]'),(6,1,'{\"latitude\": 11.1531815, \"longitude\": 76.9478982, \"location_name\": \"25C/1, Periyanaickenpalayam\"}','[{\"role\": null, \"user_id\": 2, \"latitude\": 11.1531819, \"full_name\": null, \"longitude\": 76.9478988, \"distance_km\": 0, \"location_name\": \"25C/1, Periyanaickenpalayam, Periyanaickenpalayam, Tamil Nadu, India, (641020)\", \"mobile_number\": \"+919942883596\"}, {\"role\": null, \"user_id\": 3, \"latitude\": 11.153183, \"full_name\": null, \"longitude\": 76.9478995, \"distance_km\": 0, \"location_name\": \"25C/1, Periyanaickenpalayam, Periyanaickenpalayam, Tamil Nadu, India, (641020)\", \"mobile_number\": \"+919942883597\"}]',1,'2026-08-09 13:04:25','2026-08-09 13:04:25','[{\"status\": 0, \"user_id\": 2}, {\"status\": 0, \"user_id\": 3}]'),(7,1,'{\"latitude\": 11.1531823, \"longitude\": 76.9478992, \"location_name\": \"25C/1, Periyanaickenpalayam\"}','[{\"role\": null, \"user_id\": 2, \"latitude\": 11.1531819, \"full_name\": null, \"longitude\": 76.9478988, \"distance_km\": 0, \"location_name\": \"25C/1, Periyanaickenpalayam, Periyanaickenpalayam, Tamil Nadu, India, (641020)\", \"mobile_number\": \"+919942883596\"}, {\"role\": null, \"user_id\": 3, \"latitude\": 11.153183, \"full_name\": null, \"longitude\": 76.9478995, \"distance_km\": 0, \"location_name\": \"25C/1, Periyanaickenpalayam, Periyanaickenpalayam, Tamil Nadu, India, (641020)\", \"mobile_number\": \"+919942883597\"}]',1,'2026-08-09 13:08:15','2026-08-09 13:08:15','[{\"status\": 0, \"user_id\": 2}, {\"status\": 0, \"user_id\": 3}]'),(8,1,'{\"latitude\": 11.0825274, \"longitude\": 76.996887, \"location_name\": \"3XMW+3Q3, 10th Street, Coimbatore\"}','[]',1,'2026-08-10 07:09:38','2026-08-10 07:09:38','[]'),(9,1,'{\"latitude\": 11.1524527, \"longitude\": 76.9486424, \"location_name\": \"30/722, Periyanaickenpalayam\"}','[{\"role\": null, \"user_id\": 2, \"latitude\": 11.1527833, \"full_name\": null, \"longitude\": 76.9482823, \"distance_km\": 0.05, \"location_name\": \"25C/2, Periyanaickenpalayam, Tamil Nadu, India, (641020)\", \"mobile_number\": \"+919942883596\"}, {\"role\": null, \"user_id\": 3, \"latitude\": 11.153183, \"full_name\": null, \"longitude\": 76.9478995, \"distance_km\": 0.11, \"location_name\": \"25C/1, Periyanaickenpalayam, Periyanaickenpalayam, Tamil Nadu, India, (641020)\", \"mobile_number\": \"+919942883597\"}]',1,'2026-08-11 14:04:54','2026-08-11 14:04:54','[{\"status\": 0, \"user_id\": 2}, {\"status\": 0, \"user_id\": 3}]'),(10,1,'{\"latitude\": 11.1527833, \"longitude\": 76.9482823, \"location_name\": \"25C/2, Periyanaickenpalayam\"}','[{\"role\": null, \"user_id\": 2, \"latitude\": 11.1527833, \"full_name\": null, \"longitude\": 76.9482823, \"distance_km\": 0, \"location_name\": \"25C/2, Periyanaickenpalayam, Tamil Nadu, India, (641020)\", \"mobile_number\": \"+919942883596\"}, {\"role\": null, \"user_id\": 3, \"latitude\": 11.153183, \"full_name\": null, \"longitude\": 76.9478995, \"distance_km\": 0.06, \"location_name\": \"25C/1, Periyanaickenpalayam, Periyanaickenpalayam, Tamil Nadu, India, (641020)\", \"mobile_number\": \"+919942883597\"}]',1,'2026-08-11 14:31:00','2026-08-11 14:31:00','[{\"status\": 0, \"user_id\": 2}, {\"status\": 0, \"user_id\": 3}]'),(11,1,'{\"latitude\": 11.1534762, \"longitude\": 76.9482823, \"location_name\": \"24/7A, Periyanaickenpalayam\"}','[{\"role\": null, \"user_id\": 2, \"latitude\": 11.1527833, \"full_name\": null, \"longitude\": 76.9482823, \"distance_km\": 0.08, \"location_name\": \"25C/2, Periyanaickenpalayam, Tamil Nadu, India, (641020)\", \"mobile_number\": \"+919942883596\"}, {\"role\": null, \"user_id\": 3, \"latitude\": 11.153183, \"full_name\": null, \"longitude\": 76.9478995, \"distance_km\": 0.05, \"location_name\": \"25C/1, Periyanaickenpalayam, Periyanaickenpalayam, Tamil Nadu, India, (641020)\", \"mobile_number\": \"+919942883597\"}]',1,'2026-08-11 14:53:50','2026-08-13 10:00:30','[{\"status\": 1, \"user_id\": 2, \"received_at\": \"2026-08-13T10:00:30.858Z\"}, {\"status\": 0, \"user_id\": 3}]'),(12,1,'{\"latitude\": 11.1527833, \"longitude\": 76.9482823, \"location_name\": \"25C/2, Periyanaickenpalayam\"}','[{\"role\": null, \"user_id\": 2, \"latitude\": 11.1527833, \"full_name\": null, \"longitude\": 76.9482823, \"distance_km\": 0, \"location_name\": \"25C/2, Periyanaickenpalayam, Tamil Nadu, India, (641020)\", \"mobile_number\": \"+919942883596\"}, {\"role\": null, \"user_id\": 3, \"latitude\": 11.153183, \"full_name\": null, \"longitude\": 76.9478995, \"distance_km\": 0.06, \"location_name\": \"25C/1, Periyanaickenpalayam, Periyanaickenpalayam, Tamil Nadu, India, (641020)\", \"mobile_number\": \"+919942883597\"}]',1,'2026-08-11 15:05:38','2026-08-13 09:59:52','[{\"status\": 1, \"user_id\": 2, \"received_at\": \"2026-08-13T09:59:52.721Z\"}, {\"status\": 0, \"user_id\": 3}]'),(13,1,'{\"latitude\": 11.1527833, \"longitude\": 76.9482823, \"location_name\": \"25C/2, Periyanaickenpalayam\"}','[{\"role\": null, \"user_id\": 2, \"latitude\": 11.1527833, \"full_name\": null, \"longitude\": 76.9482823, \"distance_km\": 0, \"location_name\": \"25C/2, Periyanaickenpalayam, Tamil Nadu, India, (641020)\", \"mobile_number\": \"+919942883596\"}, {\"role\": null, \"user_id\": 3, \"latitude\": 11.153183, \"full_name\": null, \"longitude\": 76.9478995, \"distance_km\": 0.06, \"location_name\": \"25C/1, Periyanaickenpalayam, Periyanaickenpalayam, Tamil Nadu, India, (641020)\", \"mobile_number\": \"+919942883597\"}]',1,'2026-08-11 15:07:52','2026-08-13 09:44:50','[{\"status\": 1, \"user_id\": 2, \"received_at\": \"2026-08-13T09:44:50.153Z\"}, {\"status\": 0, \"user_id\": 3}]'),(14,1,'{\"latitude\": 11.1532171, \"longitude\": 76.9485645, \"location_name\": \"14/7 h, Street Number 1, Periyanaickenpalayam\"}','[{\"role\": null, \"user_id\": 2, \"latitude\": 11.1527833, \"full_name\": null, \"longitude\": 76.9482823, \"distance_km\": 0.06, \"location_name\": \"25C/2, Periyanaickenpalayam, Tamil Nadu, India, (641020)\", \"mobile_number\": \"+919942883596\"}, {\"role\": null, \"user_id\": 3, \"latitude\": 11.153183, \"full_name\": null, \"longitude\": 76.9478995, \"distance_km\": 0.07, \"location_name\": \"25C/1, Periyanaickenpalayam, Periyanaickenpalayam, Tamil Nadu, India, (641020)\", \"mobile_number\": \"+919942883597\"}]',1,'2026-08-11 15:09:12','2026-08-13 09:44:30','[{\"status\": 1, \"user_id\": 2, \"received_at\": \"2026-08-13T09:44:30.515Z\"}, {\"status\": 0, \"user_id\": 3}]'),(15,1,'{\"latitude\": 11.1541328, \"longitude\": 76.9474586, \"location_name\": \"178, Periyanackenpalayam To Keeranatham Road, Periyanaickenpalayam\"}','[{\"role\": null, \"user_id\": 2, \"latitude\": 11.1527833, \"full_name\": null, \"longitude\": 76.9482823, \"distance_km\": 0.17, \"location_name\": \"25C/2, Periyanaickenpalayam, Tamil Nadu, India, (641020)\", \"mobile_number\": \"+919942883596\"}, {\"role\": null, \"user_id\": 3, \"latitude\": 11.153183, \"full_name\": null, \"longitude\": 76.9478995, \"distance_km\": 0.12, \"location_name\": \"25C/1, Periyanaickenpalayam, Periyanaickenpalayam, Tamil Nadu, India, (641020)\", \"mobile_number\": \"+919942883597\"}]',1,'2026-08-11 15:10:04','2026-08-13 10:10:28','[{\"status\": 1, \"user_id\": 2, \"received_at\": \"2026-08-11T16:11:14.340Z\"}, {\"status\": 1, \"user_id\": 3, \"received_at\": \"2026-08-13T10:10:28.757Z\"}]'),(16,1,'{\"latitude\": 11.1524527, \"longitude\": 76.9486424, \"location_name\": \"30/722, Periyanaickenpalayam\"}','[{\"role\": null, \"user_id\": 2, \"latitude\": 11.1527833, \"full_name\": null, \"longitude\": 76.9482823, \"distance_km\": 0.05, \"location_name\": \"25C/2, Periyanaickenpalayam, Tamil Nadu, India, (641020)\", \"mobile_number\": \"+919942883596\"}, {\"role\": null, \"user_id\": 3, \"latitude\": 11.153183, \"full_name\": null, \"longitude\": 76.9478995, \"distance_km\": 0.11, \"location_name\": \"25C/1, Periyanaickenpalayam, Periyanaickenpalayam, Tamil Nadu, India, (641020)\", \"mobile_number\": \"+919942883597\"}]',1,'2026-08-11 15:24:08','2026-08-13 09:42:22','[{\"status\": 1, \"user_id\": 2, \"received_at\": \"2026-08-11T16:10:37.381Z\"}, {\"status\": 1, \"user_id\": 3, \"received_at\": \"2026-08-13T09:42:22.853Z\"}]'),(17,1,'{\"latitude\": 11.1524527, \"longitude\": 76.9486424, \"location_name\": \"30/722, Periyanaickenpalayam\"}','[{\"role\": null, \"user_id\": 2, \"latitude\": 11.1527833, \"full_name\": null, \"longitude\": 76.9482823, \"distance_km\": 0.05, \"location_name\": \"25C/2, Periyanaickenpalayam, Tamil Nadu, India, (641020)\", \"mobile_number\": \"+919942883596\"}, {\"role\": null, \"user_id\": 3, \"latitude\": 11.153183, \"full_name\": null, \"longitude\": 76.9478995, \"distance_km\": 0.11, \"location_name\": \"25C/1, Periyanaickenpalayam, Periyanaickenpalayam, Tamil Nadu, India, (641020)\", \"mobile_number\": \"+919942883597\"}]',1,'2026-08-11 15:34:37','2026-08-13 09:42:19','[{\"status\": 1, \"user_id\": 2, \"received_at\": \"2026-08-11T16:04:13.561Z\"}, {\"status\": 1, \"user_id\": 3, \"received_at\": \"2026-08-13T09:42:19.365Z\"}]'),(18,3,'{\"latitude\": 11.0834363, \"longitude\": 76.9975272, \"location_name\": \"3XMX+93W, Thudiyalur Road, Coimbatore\"}','[{\"role\": \"Mentor,volunteer\", \"user_id\": 1, \"latitude\": 11.0834126, \"full_name\": \"Sanjay R\", \"longitude\": 76.9975528, \"distance_km\": 0, \"location_name\": \"3XMX+93W, Thudiyalur Road, Saravanampatti, Coimbatore, Tamil Nadu, India, (641035)\", \"mobile_number\": \"+919942883595\"}, {\"role\": null, \"user_id\": 2, \"latitude\": 11.0833394, \"full_name\": null, \"longitude\": 76.9975266, \"distance_km\": 0.01, \"location_name\": \"365, Thudiyalur Road, Saravanampatti, Coimbatore, Tamil Nadu, India, (641035)\", \"mobile_number\": \"+919942883596\"}]',1,'2026-08-13 10:10:01','2026-08-14 19:02:52','[{\"status\": 1, \"user_id\": 1, \"received_at\": \"2026-08-14T19:02:52.257Z\"}, {\"status\": 1, \"user_id\": 2, \"received_at\": \"2026-08-13T10:10:13.459Z\"}]'),(19,1,'{\"latitude\": 11.0228362, \"longitude\": 76.9864809, \"location_name\": \"55-A, Nava India Road, Coimbatore\"}','[]',1,'2026-08-14 10:57:41','2026-08-14 10:57:41','[]'),(20,1,'{\"latitude\": 11.0228327, \"longitude\": 76.9864827, \"location_name\": \"55-A, Nava India Road, Coimbatore\"}','[]',1,'2026-08-14 10:58:10','2026-08-14 10:58:10','[]'),(21,1,'{\"latitude\": 11.0228327, \"longitude\": 76.9864827, \"location_name\": \"55-A, Nava India Road, Coimbatore\"}','[]',1,'2026-08-14 10:58:21','2026-08-14 10:58:21','[]'),(22,1,'{\"latitude\": 11.0228649, \"longitude\": 76.9864597, \"location_name\": \"55-A, Nava India Road, Coimbatore\"}','[]',1,'2026-08-14 12:40:02','2026-08-14 12:40:02','[]'),(23,1,'{\"latitude\": 11.022912, \"longitude\": 76.9864412, \"location_name\": \"55-A, Nava India Road, Coimbatore\"}','[]',1,'2026-08-14 13:15:51','2026-08-14 13:15:51','[]');
/*!40000 ALTER TABLE `sos_ambulance_alert` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sos_clips`
--

DROP TABLE IF EXISTS `sos_clips`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sos_clips` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `username` varchar(100) DEFAULT NULL,
  `cid` varchar(150) NOT NULL,
  `gateway_url` varchar(500) NOT NULL,
  `latitude` decimal(10,6) DEFAULT NULL,
  `longitude` decimal(10,6) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `sos_clips_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sos_clips`
--

LOCK TABLES `sos_clips` WRITE;
/*!40000 ALTER TABLE `sos_clips` DISABLE KEYS */;
INSERT INTO `sos_clips` VALUES (1,1,'sanjay r','bafybeiaqrtwoikglub3pkgq2oghmcvf3ocfiak7q33pvulbielqruzooyu','https://gateway.pinata.cloud/ipfs/bafybeiaqrtwoikglub3pkgq2oghmcvf3ocfiak7q33pvulbielqruzooyu',11.153182,76.947899,'2026-08-09 13:22:07');
/*!40000 ALTER TABLE `sos_clips` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sos_emergency_contact`
--

DROP TABLE IF EXISTS `sos_emergency_contact`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sos_emergency_contact` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `contact_name` varchar(100) NOT NULL,
  `contact_number` varchar(20) NOT NULL,
  `country_code` varchar(10) DEFAULT '+91',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `status` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_contact` (`user_id`,`contact_number`),
  CONSTRAINT `sos_emergency_contact_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=36 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sos_emergency_contact`
--

LOCK TABLES `sos_emergency_contact` WRITE;
/*!40000 ALTER TABLE `sos_emergency_contact` DISABLE KEYS */;
INSERT INTO `sos_emergency_contact` VALUES (1,1,'Raj','9942883562','+91','2026-08-09 15:25:40','2026-08-09 18:12:46',0),(2,1,'Ragava','9465832946','+91','2026-08-09 16:10:36','2026-08-09 18:13:24',0),(3,1,'Rajesh Kumar','9876543210','+91','2026-08-09 16:12:31','2026-08-11 08:48:42',1),(4,1,'Priya Sharma','9876543211','+91','2026-08-09 16:12:31','2026-08-11 08:48:42',1),(5,1,'Amit Singh','9876543212','+91','2026-08-09 16:12:31','2026-08-11 08:48:42',1),(6,1,'Sneha Reddy','9876543213','+91','2026-08-09 16:12:31','2026-08-11 08:48:42',1),(7,1,'Vikram Patel','9876543214','+91','2026-08-09 16:12:31','2026-08-11 08:48:42',1),(8,1,'Ananya Iyer','9876543215','+91','2026-08-09 16:12:31','2026-08-11 08:48:42',1),(9,1,'Karan Malhotra','9876543216','+91','2026-08-09 16:12:31','2026-08-11 08:48:42',1),(10,1,'Meera Nair','9876543217','+91','2026-08-09 16:12:31','2026-08-11 08:48:42',1),(11,1,'Arjun Rao','9876543218','+91','2026-08-09 16:12:31','2026-08-11 08:48:42',1),(12,1,'Divya Menon','9876543219','+91','2026-08-09 16:12:31','2026-08-11 08:48:42',1),(13,1,'Ravi Desai','9876543220','+91','2026-08-09 16:12:31','2026-08-11 08:48:42',1),(14,1,'Kavya Krishnan','9876543221','+91','2026-08-09 16:12:31','2026-08-11 08:48:42',1),(15,1,'Suresh Babu','9876543222','+91','2026-08-09 16:12:31','2026-08-11 08:48:42',1),(16,1,'Lakshmi Narayanan','9876543223','+91','2026-08-09 16:12:31','2026-08-11 08:48:42',1),(17,1,'Manoj Gupta','9876543224','+91','2026-08-09 16:12:31','2026-08-11 08:48:42',1),(18,1,'Pooja Jain','9876543225','+91','2026-08-09 16:12:31','2026-08-11 08:48:42',1),(19,1,'Ganesh Iyer','9876543226','+91','2026-08-09 16:12:31','2026-08-11 08:48:42',1),(20,1,'Rekha Warrier','9876543227','+91','2026-08-09 16:12:31','2026-08-11 08:48:42',1),(21,1,'Santhosh Kumar','9876543228','+91','2026-08-09 16:12:31','2026-08-09 18:21:35',0),(22,1,'Deepa Chandran','9876543229','+91','2026-08-09 16:12:31','2026-08-09 18:10:51',0),(29,1,'Deepa Chandran','9876543200','+91','2026-08-09 18:10:51','2026-08-09 18:10:51',0),(30,1,'Ragava','9465832000','+91','2026-08-09 18:13:24','2026-08-09 18:14:13',0),(31,1,'Ragava','9465832111','+91','2026-08-09 18:14:13','2026-08-09 18:14:41',0),(32,1,'Santhosh Kumar','9876543000','+91','2026-08-09 18:21:34','2026-08-11 08:48:42',1),(33,1,'Sandhiya','6384965286','+91','2026-08-09 18:26:55','2026-08-10 09:19:09',0),(34,1,'Sandhiya','6384965000','+91','2026-08-10 09:19:09','2026-08-11 08:48:42',0),(35,1,'Sandhiya','6384965111','+91','2026-08-11 08:48:42','2026-08-11 08:48:42',1);
/*!40000 ALTER TABLE `sos_emergency_contact` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sos_message_broadcast`
--

DROP TABLE IF EXISTS `sos_message_broadcast`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sos_message_broadcast` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `emergency_contacts` json DEFAULT NULL,
  `nearby_users` json DEFAULT NULL,
  `message` text,
  `is_stopped` tinyint(1) NOT NULL DEFAULT '0',
  `latitude` decimal(10,8) DEFAULT NULL,
  `longitude` decimal(11,8) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `users_received` json DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_broadcast_user` (`user_id`),
  CONSTRAINT `fk_broadcast_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sos_message_broadcast`
--

LOCK TABLES `sos_message_broadcast` WRITE;
/*!40000 ALTER TABLE `sos_message_broadcast` DISABLE KEYS */;
INSERT INTO `sos_message_broadcast` VALUES (1,1,'[{\"contact_name\": \"Sandhiya\", \"contact_number\": \"+916384965111\"}, {\"contact_name\": \"Santhosh Kumar\", \"contact_number\": \"+919876543000\"}, {\"contact_name\": \"Rekha Warrier\", \"contact_number\": \"+919876543227\"}, {\"contact_name\": \"Ganesh Iyer\", \"contact_number\": \"+919876543226\"}, {\"contact_name\": \"Pooja Jain\", \"contact_number\": \"+919876543225\"}, {\"contact_name\": \"Manoj Gupta\", \"contact_number\": \"+919876543224\"}, {\"contact_name\": \"Lakshmi Narayanan\", \"contact_number\": \"+919876543223\"}, {\"contact_name\": \"Suresh Babu\", \"contact_number\": \"+919876543222\"}, {\"contact_name\": \"Kavya Krishnan\", \"contact_number\": \"+919876543221\"}, {\"contact_name\": \"Ravi Desai\", \"contact_number\": \"+919876543220\"}, {\"contact_name\": \"Divya Menon\", \"contact_number\": \"+919876543219\"}, {\"contact_name\": \"Arjun Rao\", \"contact_number\": \"+919876543218\"}, {\"contact_name\": \"Meera Nair\", \"contact_number\": \"+919876543217\"}, {\"contact_name\": \"Karan Malhotra\", \"contact_number\": \"+919876543216\"}, {\"contact_name\": \"Ananya Iyer\", \"contact_number\": \"+919876543215\"}, {\"contact_name\": \"Vikram Patel\", \"contact_number\": \"+919876543214\"}, {\"contact_name\": \"Sneha Reddy\", \"contact_number\": \"+919876543213\"}, {\"contact_name\": \"Amit Singh\", \"contact_number\": \"+919876543212\"}, {\"contact_name\": \"Priya Sharma\", \"contact_number\": \"+919876543211\"}, {\"contact_name\": \"Rajesh Kumar\", \"contact_number\": \"+919876543210\"}]',NULL,NULL,1,NULL,NULL,'2026-08-11 09:21:10','2026-08-11 09:21:18',NULL),(2,1,'[{\"contact_name\": \"Sandhiya\", \"contact_number\": \"+916384965111\"}, {\"contact_name\": \"Santhosh Kumar\", \"contact_number\": \"+919876543000\"}, {\"contact_name\": \"Rekha Warrier\", \"contact_number\": \"+919876543227\"}, {\"contact_name\": \"Ganesh Iyer\", \"contact_number\": \"+919876543226\"}, {\"contact_name\": \"Pooja Jain\", \"contact_number\": \"+919876543225\"}, {\"contact_name\": \"Manoj Gupta\", \"contact_number\": \"+919876543224\"}, {\"contact_name\": \"Lakshmi Narayanan\", \"contact_number\": \"+919876543223\"}, {\"contact_name\": \"Suresh Babu\", \"contact_number\": \"+919876543222\"}, {\"contact_name\": \"Kavya Krishnan\", \"contact_number\": \"+919876543221\"}, {\"contact_name\": \"Ravi Desai\", \"contact_number\": \"+919876543220\"}, {\"contact_name\": \"Divya Menon\", \"contact_number\": \"+919876543219\"}, {\"contact_name\": \"Arjun Rao\", \"contact_number\": \"+919876543218\"}, {\"contact_name\": \"Meera Nair\", \"contact_number\": \"+919876543217\"}, {\"contact_name\": \"Karan Malhotra\", \"contact_number\": \"+919876543216\"}, {\"contact_name\": \"Ananya Iyer\", \"contact_number\": \"+919876543215\"}, {\"contact_name\": \"Vikram Patel\", \"contact_number\": \"+919876543214\"}, {\"contact_name\": \"Sneha Reddy\", \"contact_number\": \"+919876543213\"}, {\"contact_name\": \"Amit Singh\", \"contact_number\": \"+919876543212\"}, {\"contact_name\": \"Priya Sharma\", \"contact_number\": \"+919876543211\"}, {\"contact_name\": \"Rajesh Kumar\", \"contact_number\": \"+919876543210\"}]',NULL,'I need help',1,NULL,NULL,'2026-08-11 09:51:51','2026-08-11 09:53:03',NULL),(3,1,'[{\"contact_name\": \"Sandhiya\", \"contact_number\": \"+916384965111\"}, {\"contact_name\": \"Santhosh Kumar\", \"contact_number\": \"+919876543000\"}, {\"contact_name\": \"Rekha Warrier\", \"contact_number\": \"+919876543227\"}, {\"contact_name\": \"Ganesh Iyer\", \"contact_number\": \"+919876543226\"}, {\"contact_name\": \"Pooja Jain\", \"contact_number\": \"+919876543225\"}, {\"contact_name\": \"Manoj Gupta\", \"contact_number\": \"+919876543224\"}, {\"contact_name\": \"Lakshmi Narayanan\", \"contact_number\": \"+919876543223\"}, {\"contact_name\": \"Suresh Babu\", \"contact_number\": \"+919876543222\"}, {\"contact_name\": \"Kavya Krishnan\", \"contact_number\": \"+919876543221\"}, {\"contact_name\": \"Ravi Desai\", \"contact_number\": \"+919876543220\"}, {\"contact_name\": \"Divya Menon\", \"contact_number\": \"+919876543219\"}, {\"contact_name\": \"Arjun Rao\", \"contact_number\": \"+919876543218\"}, {\"contact_name\": \"Meera Nair\", \"contact_number\": \"+919876543217\"}, {\"contact_name\": \"Karan Malhotra\", \"contact_number\": \"+919876543216\"}, {\"contact_name\": \"Ananya Iyer\", \"contact_number\": \"+919876543215\"}, {\"contact_name\": \"Vikram Patel\", \"contact_number\": \"+919876543214\"}, {\"contact_name\": \"Sneha Reddy\", \"contact_number\": \"+919876543213\"}, {\"contact_name\": \"Amit Singh\", \"contact_number\": \"+919876543212\"}, {\"contact_name\": \"Priya Sharma\", \"contact_number\": \"+919876543211\"}, {\"contact_name\": \"Rajesh Kumar\", \"contact_number\": \"+919876543210\"}]',NULL,NULL,1,11.15245270,76.94864240,'2026-08-11 14:04:01','2026-08-11 14:04:25',NULL),(4,1,'[{\"contact_name\": \"Sandhiya\", \"contact_number\": \"+916384965111\"}, {\"contact_name\": \"Santhosh Kumar\", \"contact_number\": \"+919876543000\"}, {\"contact_name\": \"Rekha Warrier\", \"contact_number\": \"+919876543227\"}, {\"contact_name\": \"Ganesh Iyer\", \"contact_number\": \"+919876543226\"}, {\"contact_name\": \"Pooja Jain\", \"contact_number\": \"+919876543225\"}, {\"contact_name\": \"Manoj Gupta\", \"contact_number\": \"+919876543224\"}, {\"contact_name\": \"Lakshmi Narayanan\", \"contact_number\": \"+919876543223\"}, {\"contact_name\": \"Suresh Babu\", \"contact_number\": \"+919876543222\"}, {\"contact_name\": \"Kavya Krishnan\", \"contact_number\": \"+919876543221\"}, {\"contact_name\": \"Ravi Desai\", \"contact_number\": \"+919876543220\"}, {\"contact_name\": \"Divya Menon\", \"contact_number\": \"+919876543219\"}, {\"contact_name\": \"Arjun Rao\", \"contact_number\": \"+919876543218\"}, {\"contact_name\": \"Meera Nair\", \"contact_number\": \"+919876543217\"}, {\"contact_name\": \"Karan Malhotra\", \"contact_number\": \"+919876543216\"}, {\"contact_name\": \"Ananya Iyer\", \"contact_number\": \"+919876543215\"}, {\"contact_name\": \"Vikram Patel\", \"contact_number\": \"+919876543214\"}, {\"contact_name\": \"Sneha Reddy\", \"contact_number\": \"+919876543213\"}, {\"contact_name\": \"Amit Singh\", \"contact_number\": \"+919876543212\"}, {\"contact_name\": \"Priya Sharma\", \"contact_number\": \"+919876543211\"}, {\"contact_name\": \"Rajesh Kumar\", \"contact_number\": \"+919876543210\"}]',NULL,NULL,1,11.15245270,76.94864240,'2026-08-11 14:06:08','2026-08-11 14:06:13',NULL),(5,1,'[{\"contact_name\": \"Sandhiya\", \"contact_number\": \"+916384965111\"}, {\"contact_name\": \"Santhosh Kumar\", \"contact_number\": \"+919876543000\"}, {\"contact_name\": \"Rekha Warrier\", \"contact_number\": \"+919876543227\"}, {\"contact_name\": \"Ganesh Iyer\", \"contact_number\": \"+919876543226\"}, {\"contact_name\": \"Pooja Jain\", \"contact_number\": \"+919876543225\"}, {\"contact_name\": \"Manoj Gupta\", \"contact_number\": \"+919876543224\"}, {\"contact_name\": \"Lakshmi Narayanan\", \"contact_number\": \"+919876543223\"}, {\"contact_name\": \"Suresh Babu\", \"contact_number\": \"+919876543222\"}, {\"contact_name\": \"Kavya Krishnan\", \"contact_number\": \"+919876543221\"}, {\"contact_name\": \"Ravi Desai\", \"contact_number\": \"+919876543220\"}, {\"contact_name\": \"Divya Menon\", \"contact_number\": \"+919876543219\"}, {\"contact_name\": \"Arjun Rao\", \"contact_number\": \"+919876543218\"}, {\"contact_name\": \"Meera Nair\", \"contact_number\": \"+919876543217\"}, {\"contact_name\": \"Karan Malhotra\", \"contact_number\": \"+919876543216\"}, {\"contact_name\": \"Ananya Iyer\", \"contact_number\": \"+919876543215\"}, {\"contact_name\": \"Vikram Patel\", \"contact_number\": \"+919876543214\"}, {\"contact_name\": \"Sneha Reddy\", \"contact_number\": \"+919876543213\"}, {\"contact_name\": \"Amit Singh\", \"contact_number\": \"+919876543212\"}, {\"contact_name\": \"Priya Sharma\", \"contact_number\": \"+919876543211\"}, {\"contact_name\": \"Rajesh Kumar\", \"contact_number\": \"+919876543210\"}]',NULL,NULL,0,11.02287510,76.98628680,'2026-08-11 14:53:23','2026-08-15 05:15:02',NULL),(6,1,'[{\"contact_name\": \"Sandhiya\", \"contact_number\": \"+916384965111\"}, {\"contact_name\": \"Santhosh Kumar\", \"contact_number\": \"+919876543000\"}, {\"contact_name\": \"Rekha Warrier\", \"contact_number\": \"+919876543227\"}, {\"contact_name\": \"Ganesh Iyer\", \"contact_number\": \"+919876543226\"}, {\"contact_name\": \"Pooja Jain\", \"contact_number\": \"+919876543225\"}, {\"contact_name\": \"Manoj Gupta\", \"contact_number\": \"+919876543224\"}, {\"contact_name\": \"Lakshmi Narayanan\", \"contact_number\": \"+919876543223\"}, {\"contact_name\": \"Suresh Babu\", \"contact_number\": \"+919876543222\"}, {\"contact_name\": \"Kavya Krishnan\", \"contact_number\": \"+919876543221\"}, {\"contact_name\": \"Ravi Desai\", \"contact_number\": \"+919876543220\"}, {\"contact_name\": \"Divya Menon\", \"contact_number\": \"+919876543219\"}, {\"contact_name\": \"Arjun Rao\", \"contact_number\": \"+919876543218\"}, {\"contact_name\": \"Meera Nair\", \"contact_number\": \"+919876543217\"}, {\"contact_name\": \"Karan Malhotra\", \"contact_number\": \"+919876543216\"}, {\"contact_name\": \"Ananya Iyer\", \"contact_number\": \"+919876543215\"}, {\"contact_name\": \"Vikram Patel\", \"contact_number\": \"+919876543214\"}, {\"contact_name\": \"Sneha Reddy\", \"contact_number\": \"+919876543213\"}, {\"contact_name\": \"Amit Singh\", \"contact_number\": \"+919876543212\"}, {\"contact_name\": \"Priya Sharma\", \"contact_number\": \"+919876543211\"}, {\"contact_name\": \"Rajesh Kumar\", \"contact_number\": \"+919876543210\"}]',NULL,NULL,1,11.15278330,76.94828230,'2026-08-11 15:05:31','2026-08-11 15:05:35',NULL),(7,1,'[{\"contact_name\": \"Sandhiya\", \"contact_number\": \"+916384965111\"}, {\"contact_name\": \"Santhosh Kumar\", \"contact_number\": \"+919876543000\"}, {\"contact_name\": \"Rekha Warrier\", \"contact_number\": \"+919876543227\"}, {\"contact_name\": \"Ganesh Iyer\", \"contact_number\": \"+919876543226\"}, {\"contact_name\": \"Pooja Jain\", \"contact_number\": \"+919876543225\"}, {\"contact_name\": \"Manoj Gupta\", \"contact_number\": \"+919876543224\"}, {\"contact_name\": \"Lakshmi Narayanan\", \"contact_number\": \"+919876543223\"}, {\"contact_name\": \"Suresh Babu\", \"contact_number\": \"+919876543222\"}, {\"contact_name\": \"Kavya Krishnan\", \"contact_number\": \"+919876543221\"}, {\"contact_name\": \"Ravi Desai\", \"contact_number\": \"+919876543220\"}, {\"contact_name\": \"Divya Menon\", \"contact_number\": \"+919876543219\"}, {\"contact_name\": \"Arjun Rao\", \"contact_number\": \"+919876543218\"}, {\"contact_name\": \"Meera Nair\", \"contact_number\": \"+919876543217\"}, {\"contact_name\": \"Karan Malhotra\", \"contact_number\": \"+919876543216\"}, {\"contact_name\": \"Ananya Iyer\", \"contact_number\": \"+919876543215\"}, {\"contact_name\": \"Vikram Patel\", \"contact_number\": \"+919876543214\"}, {\"contact_name\": \"Sneha Reddy\", \"contact_number\": \"+919876543213\"}, {\"contact_name\": \"Amit Singh\", \"contact_number\": \"+919876543212\"}, {\"contact_name\": \"Priya Sharma\", \"contact_number\": \"+919876543211\"}, {\"contact_name\": \"Rajesh Kumar\", \"contact_number\": \"+919876543210\"}]',NULL,NULL,1,11.15278330,76.94828230,'2026-08-11 15:08:27','2026-08-11 15:08:32',NULL),(8,1,'[{\"contact_name\": \"Sandhiya\", \"contact_number\": \"+916384965111\"}, {\"contact_name\": \"Santhosh Kumar\", \"contact_number\": \"+919876543000\"}, {\"contact_name\": \"Rekha Warrier\", \"contact_number\": \"+919876543227\"}, {\"contact_name\": \"Ganesh Iyer\", \"contact_number\": \"+919876543226\"}, {\"contact_name\": \"Pooja Jain\", \"contact_number\": \"+919876543225\"}, {\"contact_name\": \"Manoj Gupta\", \"contact_number\": \"+919876543224\"}, {\"contact_name\": \"Lakshmi Narayanan\", \"contact_number\": \"+919876543223\"}, {\"contact_name\": \"Suresh Babu\", \"contact_number\": \"+919876543222\"}, {\"contact_name\": \"Kavya Krishnan\", \"contact_number\": \"+919876543221\"}, {\"contact_name\": \"Ravi Desai\", \"contact_number\": \"+919876543220\"}, {\"contact_name\": \"Divya Menon\", \"contact_number\": \"+919876543219\"}, {\"contact_name\": \"Arjun Rao\", \"contact_number\": \"+919876543218\"}, {\"contact_name\": \"Meera Nair\", \"contact_number\": \"+919876543217\"}, {\"contact_name\": \"Karan Malhotra\", \"contact_number\": \"+919876543216\"}, {\"contact_name\": \"Ananya Iyer\", \"contact_number\": \"+919876543215\"}, {\"contact_name\": \"Vikram Patel\", \"contact_number\": \"+919876543214\"}, {\"contact_name\": \"Sneha Reddy\", \"contact_number\": \"+919876543213\"}, {\"contact_name\": \"Amit Singh\", \"contact_number\": \"+919876543212\"}, {\"contact_name\": \"Priya Sharma\", \"contact_number\": \"+919876543211\"}, {\"contact_name\": \"Rajesh Kumar\", \"contact_number\": \"+919876543210\"}]','[{\"user_id\": 2, \"distance\": 54, \"username\": \"madhavan_p\", \"mobile_number\": \"+919942883596\"}, {\"user_id\": 3, \"distance\": 115, \"username\": \"madan_s\", \"mobile_number\": \"+919942883597\"}]',NULL,1,11.15312970,76.94828230,'2026-08-11 15:23:08','2026-08-11 16:08:36','[{\"user_id\": 2, \"username\": \"madhavan_p\", \"full_name\": null, \"mobile_number\": \"+919942883596\", \"offered_help_at\": \"2026-08-11T16:01:49.079Z\"}]'),(9,1,'[{\"contact_name\": \"Sandhiya\", \"contact_number\": \"+916384965111\"}, {\"contact_name\": \"Santhosh Kumar\", \"contact_number\": \"+919876543000\"}, {\"contact_name\": \"Rekha Warrier\", \"contact_number\": \"+919876543227\"}, {\"contact_name\": \"Ganesh Iyer\", \"contact_number\": \"+919876543226\"}, {\"contact_name\": \"Pooja Jain\", \"contact_number\": \"+919876543225\"}, {\"contact_name\": \"Manoj Gupta\", \"contact_number\": \"+919876543224\"}, {\"contact_name\": \"Lakshmi Narayanan\", \"contact_number\": \"+919876543223\"}, {\"contact_name\": \"Suresh Babu\", \"contact_number\": \"+919876543222\"}, {\"contact_name\": \"Kavya Krishnan\", \"contact_number\": \"+919876543221\"}, {\"contact_name\": \"Ravi Desai\", \"contact_number\": \"+919876543220\"}, {\"contact_name\": \"Divya Menon\", \"contact_number\": \"+919876543219\"}, {\"contact_name\": \"Arjun Rao\", \"contact_number\": \"+919876543218\"}, {\"contact_name\": \"Meera Nair\", \"contact_number\": \"+919876543217\"}, {\"contact_name\": \"Karan Malhotra\", \"contact_number\": \"+919876543216\"}, {\"contact_name\": \"Ananya Iyer\", \"contact_number\": \"+919876543215\"}, {\"contact_name\": \"Vikram Patel\", \"contact_number\": \"+919876543214\"}, {\"contact_name\": \"Sneha Reddy\", \"contact_number\": \"+919876543213\"}, {\"contact_name\": \"Amit Singh\", \"contact_number\": \"+919876543212\"}, {\"contact_name\": \"Priya Sharma\", \"contact_number\": \"+919876543211\"}, {\"contact_name\": \"Rajesh Kumar\", \"contact_number\": \"+919876543210\"}]','[{\"user_id\": 2, \"distance\": 54, \"username\": \"madhavan_p\", \"mobile_number\": \"+919942883596\"}, {\"user_id\": 3, \"distance\": 115, \"username\": \"madan_s\", \"mobile_number\": \"+919942883597\"}]',NULL,0,11.02287510,76.98628680,'2026-08-11 15:34:43','2026-08-15 05:15:02','[{\"user_id\": 2, \"username\": \"madhavan_p\", \"full_name\": null, \"mobile_number\": \"+919942883596\", \"offered_help_at\": \"2026-08-11T16:11:22.655Z\"}]'),(10,1,'[{\"contact_name\": \"Sandhiya\", \"contact_number\": \"+916384965111\"}, {\"contact_name\": \"Santhosh Kumar\", \"contact_number\": \"+919876543000\"}, {\"contact_name\": \"Rekha Warrier\", \"contact_number\": \"+919876543227\"}, {\"contact_name\": \"Ganesh Iyer\", \"contact_number\": \"+919876543226\"}, {\"contact_name\": \"Pooja Jain\", \"contact_number\": \"+919876543225\"}, {\"contact_name\": \"Manoj Gupta\", \"contact_number\": \"+919876543224\"}, {\"contact_name\": \"Lakshmi Narayanan\", \"contact_number\": \"+919876543223\"}, {\"contact_name\": \"Suresh Babu\", \"contact_number\": \"+919876543222\"}, {\"contact_name\": \"Kavya Krishnan\", \"contact_number\": \"+919876543221\"}, {\"contact_name\": \"Ravi Desai\", \"contact_number\": \"+919876543220\"}, {\"contact_name\": \"Divya Menon\", \"contact_number\": \"+919876543219\"}, {\"contact_name\": \"Arjun Rao\", \"contact_number\": \"+919876543218\"}, {\"contact_name\": \"Meera Nair\", \"contact_number\": \"+919876543217\"}, {\"contact_name\": \"Karan Malhotra\", \"contact_number\": \"+919876543216\"}, {\"contact_name\": \"Ananya Iyer\", \"contact_number\": \"+919876543215\"}, {\"contact_name\": \"Vikram Patel\", \"contact_number\": \"+919876543214\"}, {\"contact_name\": \"Sneha Reddy\", \"contact_number\": \"+919876543213\"}, {\"contact_name\": \"Amit Singh\", \"contact_number\": \"+919876543212\"}, {\"contact_name\": \"Priya Sharma\", \"contact_number\": \"+919876543211\"}, {\"contact_name\": \"Rajesh Kumar\", \"contact_number\": \"+919876543210\"}]','[{\"user_id\": 3, \"distance\": 6, \"username\": \"madan_s\", \"mobile_number\": \"+919942883597\"}, {\"user_id\": 2, \"distance\": 9, \"username\": \"madhavan_p\", \"mobile_number\": \"+919942883596\"}]',NULL,1,11.08341260,76.99755280,'2026-08-13 10:13:51','2026-08-13 10:13:57',NULL);
/*!40000 ALTER TABLE `sos_message_broadcast` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `support`
--

DROP TABLE IF EXISTS `support`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `support` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `volunteer_id` int NOT NULL,
  `message` text,
  `request_status` tinyint DEFAULT NULL,
  `volunteer_response` varchar(50) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_volunteer_id` (`volunteer_id`),
  KEY `idx_status` (`request_status`),
  CONSTRAINT `support_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `support_ibfk_2` FOREIGN KEY (`volunteer_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `support`
--

LOCK TABLES `support` WRITE;
/*!40000 ALTER TABLE `support` DISABLE KEYS */;
/*!40000 ALTER TABLE `support` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_additional_details`
--

DROP TABLE IF EXISTS `user_additional_details`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_additional_details` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `open_to_work` tinyint(1) DEFAULT NULL,
  `open_to_speak` tinyint(1) DEFAULT NULL,
  `preferred_work` json DEFAULT NULL,
  `open_to_cross_border_collaboration` tinyint(1) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `user_additional_details_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_additional_details`
--

LOCK TABLES `user_additional_details` WRITE;
/*!40000 ALTER TABLE `user_additional_details` DISABLE KEYS */;
INSERT INTO `user_additional_details` VALUES (1,1,0,1,'[]',1,'2026-07-17 11:24:03','2026-08-09 14:13:29'),(2,2,1,1,'[\"Freelance\"]',1,'2026-08-14 15:46:17','2026-08-14 15:46:17'),(3,3,1,1,'[\"Part-time\", \"Freelance\"]',1,'2026-08-14 16:40:00','2026-08-14 16:40:00'),(4,4,0,1,'[]',0,'2026-08-14 16:40:00','2026-08-14 16:40:00'),(5,5,1,1,'[\"Freelance\"]',0,'2026-08-14 16:40:00','2026-08-14 16:40:00'),(6,6,1,1,'[\"Full-time\", \"Freelance\"]',1,'2026-08-14 16:40:00','2026-08-14 16:40:00'),(7,7,1,0,'[\"Full-time\"]',0,'2026-08-14 16:40:00','2026-08-14 16:40:00'),(8,8,0,1,'[]',1,'2026-08-14 16:40:00','2026-08-14 16:40:00'),(9,9,1,1,'[\"Full-time\", \"Part-time\"]',1,'2026-08-14 16:40:00','2026-08-14 16:40:00'),(10,10,1,1,'[\"Full-time\"]',0,'2026-08-14 16:40:00','2026-08-14 16:40:00');
/*!40000 ALTER TABLE `user_additional_details` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_expertise`
--

DROP TABLE IF EXISTS `user_expertise`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_expertise` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `domain` varchar(100) DEFAULT NULL,
  `skills` varchar(255) DEFAULT NULL,
  `occupation` varchar(100) DEFAULT NULL,
  `years_of_experience` varchar(20) DEFAULT NULL,
  `highest_education_qualification` varchar(100) DEFAULT NULL,
  `test_link` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `preferred_language` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `user_expertise_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_expertise`
--

LOCK TABLES `user_expertise` WRITE;
/*!40000 ALTER TABLE `user_expertise` DISABLE KEYS */;
INSERT INTO `user_expertise` VALUES (1,1,'IT sector','Software development, 3d modelling,devops','Software engineer','3','M.Sc','','2026-07-17 11:24:03','2026-08-14 10:47:54','English'),(2,2,'Python guidance ','Python professor ','Career guider ','5','Phd','','2026-08-14 15:46:17','2026-08-14 15:46:17','English '),(3,3,'Healthcare / Cardiology','Patient care, Diagnostics, Cardiac Life Support','Cardiologist','10','MD Cardiology','','2026-08-14 16:30:00','2026-08-14 16:30:00','Tamil, English'),(4,4,'Law Enforcement','Criminal investigation, Crisis management','Inspector of Police','12','B.A. Criminology','','2026-08-14 16:30:00','2026-08-14 16:30:00','Tamil, English, Malayalam'),(5,5,'Legal / Criminal Defense','Legal counseling, Court proceedings, Rights advocacy','Criminal Lawyer','8','LLM','','2026-08-14 16:30:00','2026-08-14 16:30:00','Tamil, English'),(6,6,'AI/ML / Emergency Tech','Python, Machine Learning, System Architecture','AI/ML Developer','4','B.Tech CS','','2026-08-14 16:30:00','2026-08-14 16:30:00','Tamil, English'),(7,7,'Emergency Medicine','Emergency trauma care, Triage, Patient monitoring','ER Nurse','6','B.Sc Nursing','','2026-08-14 16:30:00','2026-08-14 16:30:00','Tamil, English, Telugu');
/*!40000 ALTER TABLE `user_expertise` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_seeking_mentorship`
--

DROP TABLE IF EXISTS `user_seeking_mentorship`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_seeking_mentorship` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `title` varchar(150) DEFAULT NULL,
  `description` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `user_seeking_mentorship_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_seeking_mentorship`
--

LOCK TABLES `user_seeking_mentorship` WRITE;
/*!40000 ALTER TABLE `user_seeking_mentorship` DISABLE KEYS */;
INSERT INTO `user_seeking_mentorship` VALUES (1,1,'','','2026-07-17 11:24:03','2026-07-17 11:24:03'),(2,2,'','','2026-08-14 15:46:17','2026-08-14 15:46:17'),(3,3,'AI in Healthcare Analytics','Looking for a tech mentor to help me understand how machine learning can be applied to ECG data for early anomaly detection.','2026-08-14 17:00:00','2026-08-14 17:00:00'),(4,5,'Transitioning to Cyber Law','Experienced criminal defense lawyer seeking guidance from experts in cybersecurity law to better handle digital crime cases.','2026-08-14 17:00:00','2026-08-14 17:00:00'),(5,6,'Scaling SOS Systems','Seeking mentorship from experienced system architects on deploying low-latency, scalable emergency communication applications.','2026-08-14 17:00:00','2026-08-14 17:00:00'),(6,9,'Disaster-Resistant Architecture','Looking to connect with senior structural engineers specializing in earthquake-resistant and sustainable urban building materials.','2026-08-14 17:00:00','2026-08-14 17:00:00');
/*!40000 ALTER TABLE `user_seeking_mentorship` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(50) NOT NULL,
  `mobile_number` varchar(15) NOT NULL,
  `password` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `full_name` varchar(100) DEFAULT NULL,
  `date_of_birth` varchar(20) DEFAULT NULL,
  `language_known` varchar(255) DEFAULT NULL,
  `gender` varchar(20) DEFAULT NULL,
  `blood_group` varchar(10) DEFAULT NULL,
  `about_me` text,
  `role` varchar(50) DEFAULT NULL,
  `address` varchar(255) DEFAULT NULL,
  `city` varchar(100) DEFAULT NULL,
  `state` varchar(100) DEFAULT NULL,
  `pincode` varchar(10) DEFAULT NULL,
  `current_location` varchar(255) DEFAULT NULL,
  `current_latitude` varchar(50) DEFAULT NULL,
  `current_longitude` varchar(50) DEFAULT NULL,
  `emergency_pin` int DEFAULT NULL,
  `location_updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `mobile_number` (`mobile_number`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'sanjay r','+919942883595','1','2026-07-17 05:54:16','Sanjay R','30/10/2004','Tamil,English,Hindi,Malayalam','Male','','Passionate mentor and active volunteer dedicated to guiding youth, sharing knowledge, and contributing to community development initiatives.','Mentor,volunteer','25-C ,Union tank road 1st street ,periyanaicken palayam,coimbatore','Coimbatore','Tamilnadu','641020','55-A, Nava India Road, Illango Nagar, Coimbatore, Tamil Nadu, India, (641006)','11.0228751','76.9862868',1111,NULL),(2,'madhavan_p','+919942883596','1','2026-07-17 05:54:16','Madhavan ','12/01/2005','Tamil','Male ','AB+','Dedicated career guider helping individuals discover their potential, navigate professional challenges, and build successful, long-term career paths.','Career guider','Kandhipuram','Coimbatore ','Tamil Nadu ','641024','55-A, Nava India Road, Illango Nagar, Coimbatore, Tamil Nadu, India, (641006)','11.0229166','76.9864305',NULL,NULL),(3,'madan_s','+919942883597','1','2026-07-17 05:54:16','Madan S','15/08/1985','Tamil,English','Male','O+','Cardiologist with 10 years experience. Available for medical guidance.','Doctor,Mentor','10, KK Nagar','Madurai','Tamil Nadu','625020','Anna Bus Stand, Madurai, Tamil Nadu','9.925200','78.119800',1234,NULL),(4,'shiju','+919942883591','1','2026-07-17 05:54:16','Shiju K','22/04/1990','Tamil,English,Malayalam','Male','A-','Inspector of Police. Dedicated to public safety and quick response.','Police,Emergency','15, Greams Road','Chennai','Tamil Nadu','600006','Thousand Lights, Chennai, Tamil Nadu','13.060400','80.249600',9999,NULL),(5,'santhosh','+919942883592','1','2026-07-17 05:54:16','Santhosh Kumar','10/11/1988','Tamil,English','Male','B+','Criminal defense lawyer advocating for justice and legal awareness.','Lawyer,Career Guider','45, Cantonment','Trichy','Tamil Nadu','620001','District Court, Trichy, Tamil Nadu','10.805000','78.685600',4321,NULL),(6,'eric','+919942883593','1','2026-07-17 05:54:16','Eric Samuel','05/09/1995','Tamil,English','Male','O-','AI/ML Developer mentoring tech enthusiasts and building SOS tech.','Developer,Mentor','25C/1, Periyanaickenpalayam','Coimbatore','Tamil Nadu','641020','Periyanaickenpalayam, Tamil Nadu, India, (641020)','11.153174','76.947915',5678,NULL),(7,'sankar','+919942883598','1','2026-07-17 05:54:16','Sankar Ram','30/03/1992','Tamil,English,Telugu','Male','AB+','ER Nurse ready to assist in medical emergencies and basic first aid.','Nurse,Volunteer','88, Fairlands','Salem','Tamil Nadu','636016','Government Hospital, Salem, Tamil Nadu','11.664300','78.146000',8888,NULL),(8,'sidarth','+919942883599','1','2026-07-17 05:54:16','Sidarth V','14/02/1980','Tamil,English','Male','A+','Local ward member focusing on community development and civil issues.','Politician','12, Vannarpettai','Tirunelveli','Tamil Nadu','627003','Vannarpettai, Tirunelveli, Tamil Nadu','8.713900','77.756700',0,NULL),(9,'ragul','+919942883590','1','2026-07-17 05:54:16','Ragul Dravid','18/07/1993','Tamil,English,Kannada','Male','B-','Structural engineer passionate about sustainable building.','Civil Engineer,Mentor','55, Thindal','Erode','Tamil Nadu','638012','Thindal, Erode, Tamil Nadu','11.328600','77.684100',7777,NULL),(10,'gokul','+919942883594','1','2026-07-17 05:54:16','Gokul N','25/12/1996','Tamil,English','Male','O+','Fire and Rescue personnel. Always ready to act during disasters.','Firefighter,Emergency','9, Katpadi Road','Vellore','Tamil Nadu','632007','Katpadi, Vellore, Tamil Nadu','12.969100','79.139600',1010,NULL);
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-08-15 10:45:03
