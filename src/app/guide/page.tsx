'use client';

import React, { useState } from "react";
import Link from "next/link";

interface FlowStep {
  stepNumber: number;
  titleEn: string;
  titleHi: string;
  descriptionEn: string;
  descriptionHi: string;
  keyPoints: string[];
  proTipEn?: string;
  proTipHi?: string;
  badge?: string;
}

interface GuideTopic {
  id: string;
  icon: string;
  nameEn: string;
  nameHi: string;
  taglineEn: string;
  taglineHi: string;
  flowchartNodes: {
    id: string;
    labelEn: string;
    labelHi: string;
    type: "start" | "process" | "decision" | "success";
  }[];
  steps: FlowStep[];
  primaryCta: {
    label: string;
    href: string;
  };
  secondaryCta?: {
    label: string;
    href: string;
    isExternal?: boolean;
  };
  faqs: {
    qEn: string;
    qHi: string;
    aEn: string;
    aHi: string;
  }[];
}

const GUIDE_TOPICS: GuideTopic[] = [
  // 1. Family Registration
  {
    id: "registration",
    icon: "📝",
    nameEn: "Family Registration",
    nameHi: "निःशुल्क परिवार पंजीकरण",
    taglineEn: "Step-by-step guide to enrolling your household in the Agarwal Global Directory",
    taglineHi: "अग्रवाल ग्लोबल डायरेक्टरी में अपने परिवार को पंजीकृत करने की पूरी प्रक्रिया",
    flowchartNodes: [
      { id: "1", labelEn: "1. Phone / Email OTP", labelHi: "मोबाइल / ईमेल ओटीपी", type: "start" },
      { id: "2", labelEn: "2. Head Details & Gotra", labelHi: "मुखिया विवरण एवं गोत्र", type: "process" },
      { id: "3", labelEn: "3. Add Family Members", labelHi: "परिवार सदस्य एवं फोटो", type: "process" },
      { id: "4", labelEn: "4. Govt ID & Address", labelHi: "पहचान पत्र एवं पता", type: "process" },
      { id: "5", labelEn: "5. Volunteer Review", labelHi: "सत्यापन दल समीक्षा", type: "decision" },
      { id: "6", labelEn: "6. Official ID Pass Ready", labelHi: "आधिकारिक पास जारी", type: "success" },
    ],
    steps: [
      {
        stepNumber: 1,
        titleEn: "Step 1: Contact Verification via OTP",
        titleHi: "चरण 1: ओटीपी द्वारा संपर्क सत्यापन",
        descriptionEn: "Visit the registration page (/signup) and enter your active mobile phone number or email address. Click 'Send OTP' to receive an instant 6-digit verification code.",
        descriptionHi: "पंजीकरण पृष्ठ (/signup) पर जाएं और अपना सक्रिय मोबाइल नंबर या ईमेल दर्ज करें। 6-अंकों का त्वरित सत्यापन कोड प्राप्त करने के लिए 'Send OTP' पर क्लिक करें।",
        keyPoints: [
          "Supported across Singapore (+65), India (+91), and all international country codes",
          "Verification ensures your account is permanently secure and verified",
          "Registration is 100% FREE OF CHARGE (पूर्णतः निःशुल्क)",
        ],
        proTipEn: "If you do not receive the SMS within 30 seconds, you can also opt for Email OTP verification.",
        proTipHi: "यदि 30 सेकंड में एसएमएस प्राप्त न हो, तो आप ईमेल ओटीपी विकल्प का भी उपयोग कर सकते हैं।",
      },
      {
        stepNumber: 2,
        titleEn: "Step 2: Head of Household & 18 Gotras Details",
        titleHi: "चरण 2: परिवार मुखिया विवरण एवं 18 गोत्र चयन",
        descriptionEn: "Enter the Head of Household's full name, father's name, ancestral native place (मूल निवास), and select your canonical Gotra from the 18 established Gotras founded by Maharaja Agrasen.",
        descriptionHi: "परिवार के मुखिया का पूरा नाम, पिता का नाम, पैतृक मूल निवास दर्ज करें और महाराजा अग्रसेन जी द्वारा स्थापित 18 गोत्रों में से अपना गोत्र चुनें।",
        keyPoints: [
          "Canonical 18 Gotras: Garg, Bansal, Bindal, Dharan, Airon, Goyal, Jindal, Kansal, Kuchhal, Madhukul, Mangal, Mittal, Nangil, Singhal, Tayal, Tingal, Vatsil, Kasal",
          "Ancestral native place helps relatives from your home district identify your lineage",
          "You can optionally set a secure account password or use passwordless OTP login",
        ],
        proTipEn: "Ensure the spelling of your ancestral village or city matches family records for seamless community discovery.",
        proTipHi: "अपने पैतृक गांव या शहर की सही वर्तनी लिखें ताकि स्वजन आपको आसानी से खोज सकें।",
      },
      {
        stepNumber: 3,
        titleEn: "Step 3: Add Family Members & Profile Photos",
        titleHi: "चरण 3: परिवार के सदस्य जोड़ना एवं फोटो अपलोड",
        descriptionEn: "Add each family member (spouse, children, parents) with their relationship to the head, date of birth, and profession. A clear passport-style photograph is required for each member to generate their official ID card.",
        descriptionHi: "परिवार के प्रत्येक सदस्य (पत्नी/पति, बच्चे, माता-पिता) का विवरण, जन्मतिथि और व्यवसाय दर्ज करें। आधिकारिक डिजिटल पहचान पत्र हेतु प्रत्येक सदस्य का स्पष्ट फोटो आवश्यक है।",
        keyPoints: [
          "Upload clear front-facing portrait photos (JPEG, PNG, WebP up to 5MB)",
          "Adult members with their own mobile/email can later claim and manage their own profile",
          "Children and elderly parents remain safely managed under the Head of Household",
        ],
        proTipEn: "Photos are rendered directly onto official Foundation ID cards with QR codes and golden royal borders.",
        proTipHi: "अपलोड की गई फोटो सीधे फाउंडेशन के आधिकारिक क्यूआर-कोड युक्त पहचान पत्र पर प्रदर्शित होगी।",
      },
      {
        stepNumber: 4,
        titleEn: "Step 4: Residential Address & Verification ID",
        titleHi: "चरण 4: वर्तमान आवासीय पता एवं पहचान प्रमाण",
        descriptionEn: "Provide your current residential address (city, state, PIN/postal code, country). For Indian residents, Aadhaar and PAN numbers are validated; for international residents (e.g. Singapore), Passport and Tax ID are recorded.",
        descriptionHi: "अपना वर्तमान आवासीय पता और पहचान प्रमाण दर्ज करें। भारतीय निवासियों के लिए आधार व पैन, तथा अंतरराष्ट्रीय निवासियों (सिंगापुर आदि) के लिए पासपोर्ट संख्या मान्य है।",
        keyPoints: [
          "Government IDs are encrypted and protected under Singapore PDPA & India DPDP regulations",
          "Raw government ID numbers are NEVER displayed to other community members",
          "Used strictly by foundation moderators to prevent duplicate or fraudulent entries",
        ],
        proTipEn: "Your address coordinates allow you to connect with nearby Agarwal families using the 'Near Me' directory filter.",
        proTipHi: "आपके पते की सहायता से आप 'Near Me' फ़िल्टर द्वारा अपने आस-पास के अग्रवाल परिवारों से जुड़ सकते हैं।",
      },
      {
        stepNumber: 5,
        titleEn: "Step 5: Volunteer Verification & ID Card Issuance",
        titleHi: "चरण 5: सत्यापन दल समीक्षा एवं आधिकारिक डिजिटल पास",
        descriptionEn: "Upon submission, your household receives an official reference code (#AGR-2026-XXX) and enters the moderation queue. Foundation volunteers verify details within 48-72 hours, after which official PDF ID passes are emailed and accessible in your dashboard.",
        descriptionHi: "फॉर्म जमा होते ही आपके परिवार को संदर्भ संख्या (#AGR-2026-XXX) प्राप्त होगी। सत्यापन दल 48-72 घंटे में विवरण की जांच कर आधिकारिक पहचान पत्र जारी करता है।",
        keyPoints: [
          "Instant email confirmation dispatched with your reference number",
          "Once approved, all members become live and searchable in the community directory",
          "Download high-resolution laminated lanyard PDF ID cards anytime from your dashboard",
        ],
        proTipEn: "You can log in to your dashboard immediately to track moderation status or update family details.",
        proTipHi: "आप तुरंत अपने डैशबोर्ड में लॉगिन करके सत्यापन की स्थिति देख सकते हैं।",
      },
    ],
    primaryCta: {
      label: "Register Your Family Free (निःशुल्क पंजीकरण करें) →",
      href: "/signup",
    },
    secondaryCta: {
      label: "Check Moderation FAQ",
      href: "/help",
    },
    faqs: [
      {
        qEn: "Is there any registration fee or annual membership charge?",
        qHi: "क्या पंजीकरण के लिए कोई शुल्क या वार्षिक सदस्यता राशि है?",
        aEn: "No. Registration in the Maharaja Agrasen Foundation Global Directory is completely FREE OF CHARGE for all Agarwal families worldwide.",
        aHi: "नहीं। महाराजा अग्रसेन फाउंडेशन ग्लोबल डायरेक्टरी में पंजीकरण पूरे विश्व के सभी अग्रवाल परिवारों के लिए पूर्णतः निःशुल्क है।",
      },
      {
        qEn: "Can I update family details or add a newborn after submitting?",
        qHi: "क्या पंजीकरण के बाद परिवार के विवरण में बदलाव या नए सदस्य को जोड़ा जा सकता है?",
        aEn: "Yes! Simply log in to your Head Dashboard at any time and click 'Add New Family Member' or edit existing member profiles.",
        aHi: "हाँ! आप कभी भी अपने मुखिया डैशबोर्ड में लॉगिन करके 'Add New Family Member' पर क्लिक कर सकते हैं या विवरण अपडेट कर सकते हैं।",
      },
    ],
  },

  // 2. Login & Access
  {
    id: "login",
    icon: "🔑",
    nameEn: "Login & Dashboard Access",
    nameHi: "लॉगिन एवं डैशबोर्ड उपयोग",
    taglineEn: "How to access your family dashboard using passwordless OTP or secure password",
    taglineHi: "ओटीपी या पासवर्ड द्वारा अपने परिवार डैशबोर्ड में प्रवेश की सरल विधि",
    flowchartNodes: [
      { id: "1", labelEn: "1. Open /login", labelHi: "लॉगिन पृष्ठ खोलें", type: "start" },
      { id: "2", labelEn: "2. Choose Method (OTP / Pwd)", labelHi: "माध्यम चुनें (OTP या पासवर्ड)", type: "decision" },
      { id: "3", labelEn: "3. Verify 6-digit Code", labelHi: "6-अंकों का कोड दर्ज करें", type: "process" },
      { id: "4", labelEn: "4. Access Family Dashboard", labelHi: "परिवार डैशबोर्ड में प्रवेश", type: "success" },
    ],
    steps: [
      {
        stepNumber: 1,
        titleEn: "Step 1: Choose Your Preferred Login Method",
        titleHi: "चरण 1: अपनी पसंदीदा लॉगिन विधि चुनें",
        descriptionEn: "Navigate to /login. You can log in using either: 1) Instant Mobile OTP (no password required), 2) Email OTP, or 3) Master Password if you set one up during registration.",
        descriptionHi: "/login पर जाएं। आप दो आसान तरीकों से लॉगिन कर सकते हैं: 1) मोबाइल ओटीपी (बिना पासवर्ड), 2) ईमेल ओटीपी, या 3) पंजीकरण के समय बनाया गया पासवर्ड।",
        keyPoints: [
          "Passwordless OTP is the fastest and most secure method for mobile users",
          "Both Head of Household and claimed individual members use the same login page",
          "System automatically routes you to your appropriate Head or Member dashboard",
        ],
        proTipEn: "Elders can simply enter their mobile number and type the 6-digit code received via SMS—no passwords to remember!",
        proTipHi: "वरिष्ठजन केवल अपना मोबाइल नंबर डालकर एसएमएस में आया 6-अंकों का कोड दर्ज कर सकते हैं—पासवर्ड याद रखने की कोई आवश्यकता नहीं!",
      },
      {
        stepNumber: 2,
        titleEn: "Step 2: Enter Verification Code or Password",
        titleHi: "चरण 2: सत्यापन कोड या पासवर्ड दर्ज करें",
        descriptionEn: "If using OTP, enter the 6-digit code received on your phone or email. Codes expire after 10 minutes for your security.",
        descriptionHi: "ओटीपी विधि में, अपने फोन या ईमेल पर प्राप्त 6-अंकों का कोड दर्ज करें। सुरक्षा कारणों से कोड 10 मिनट के लिए मान्य रहता है।",
        keyPoints: [
          "Max 5 verification attempts permitted before a short cooldown to stop unauthorized access",
          "If you forgot your password, click 'Forgot Password' to reset instantly via OTP",
        ],
      },
      {
        stepNumber: 3,
        titleEn: "Step 3: Access Family Dashboard & Official Passes",
        titleHi: "चरण 3: डैशबोर्ड एवं डिजिटल पहचान पत्र डाउनलोड",
        descriptionEn: "Once logged in, your Head Dashboard displays all family members, your assigned Serial Number (#AGR-2026-XXX), verification badge, and direct download links for printable laminated ID cards.",
        descriptionHi: "लॉगिन होते ही आपके डैशबोर्ड में परिवार के सभी सदस्य, आवंटित सीरियल नंबर (#AGR-2026-XXX), सत्यापन स्थिति और आईडी कार्ड डाउनलोड का विकल्प दिखेगा।",
        keyPoints: [
          "Download laminated PDF ID passes with QR codes for all family members in 1 click",
          "Edit contact details, address, and profession visibility settings",
          "Send claim invites to grown-up family members so they can control their own profiles",
        ],
      },
    ],
    primaryCta: {
      label: "Login to Your Dashboard (डैशबोर्ड में लॉगिन करें) →",
      href: "/login",
    },
    secondaryCta: {
      label: "Forgot Password Recovery",
      href: "/forgot-password",
    },
    faqs: [
      {
        qEn: "What if I lost access to my registered mobile number?",
        qHi: "यदि मेरा पंजीकृत मोबाइल नंबर बंद या खो गया हो तो क्या करें?",
        aEn: "You can log in via your registered email address, or contact the Secretariat on WhatsApp (+65 9277 4444) for identity re-verification.",
        aHi: "आप अपने पंजीकृत ईमेल द्वारा लॉगिन कर सकते हैं, या पुनः सत्यापन हेतु व्हाट्सएप (+65 9277 4444) पर सचिवालय से संपर्क कर सकते हैं।",
      },
    ],
  },

  // 3. Add & Claim Members
  {
    id: "members",
    icon: "👥",
    nameEn: "Add & Claim Members",
    nameHi: "सदस्य जोड़ना एवं प्रोफाइल क्लेम",
    taglineEn: "How heads manage family members and how adult members claim self-ownership",
    taglineHi: "परिवार के मुखिया द्वारा सदस्य जोड़ना एवं वयस्क सदस्यों द्वारा प्रोफाइल क्लेम करने की विधि",
    flowchartNodes: [
      { id: "1", labelEn: "1. Head Adds Member", labelHi: "मुखिया सदस्य जोड़ते हैं", type: "start" },
      { id: "2", labelEn: "2. Generate Claim Link", labelHi: "क्लेम लिंक जनरेट करें", type: "process" },
      { id: "3", labelEn: "3. Share with Member", labelHi: "सदस्य को लिंक भेजें", type: "process" },
      { id: "4", labelEn: "4. Member Verifies Own OTP", labelHi: "सदस्य स्वयं सत्यापित करते हैं", type: "decision" },
      { id: "5", labelEn: "5. Profile Locked to Member", labelHi: "प्रोफाइल स्वतंत्र व सुरक्षित", type: "success" },
    ],
    steps: [
      {
        stepNumber: 1,
        titleEn: "Step 1: Adding a Family Member from Dashboard",
        titleHi: "चरण 1: डैशबोर्ड से नया परिवार सदस्य जोड़ना",
        descriptionEn: "The Head of Household logs into the dashboard and clicks 'Add Family Member'. Enter their full name, relation (Spouse, Son, Daughter, Parent), date of birth, profession, and photo.",
        descriptionHi: "परिवार के मुखिया डैशबोर्ड में लॉगिन कर 'Add Family Member' पर क्लिक करें। सदस्य का नाम, संबंध (पत्नी, पुत्र, पुत्री, माता-पिता), जन्मतिथि, व्यवसाय और फोटो दर्ज करें।",
        keyPoints: [
          "Initially, new members are marked as 'Managed by Head'",
          "Head can edit details, address, and photo on their behalf",
        ],
      },
      {
        stepNumber: 2,
        titleEn: "Step 2: Generating a One-Click 'Claim Invite Link'",
        titleHi: "चरण 2: 'Claim Invite Link' (प्रोफाइल क्लेम लिंक) बनाना",
        descriptionEn: "For adult family members who have their own smartphone and email, the Head clicks 'Generate Invite Link' next to their name in the dashboard settings.",
        descriptionHi: "वयस्क सदस्यों के लिए, मुखिया उनके नाम के आगे 'Generate Invite Link' पर क्लिक करते हैं। एक विशेष सुरक्षित लिंक तैयार हो जाता है।",
        keyPoints: [
          "Creates an encrypted, single-use invite token",
          "Can be copied and sent via WhatsApp or Email directly to that member",
        ],
        proTipEn: "This allows grown-up children or spouses to manage their own privacy and chat with other community members independently.",
        proTipHi: "इससे वयस्क बच्चे या जीवनसाथी अपनी गोपनीयता स्वयं नियंत्रित कर सकते हैं और समाज के अन्य सदस्यों से स्वतंत्र संवाद कर सकते हैं।",
      },
      {
        stepNumber: 3,
        titleEn: "Step 3: Member Claims Profile & Locks Ownership",
        titleHi: "चरण 3: सदस्य द्वारा प्रोफाइल क्लेम एवं स्वामित्व सुरक्षित",
        descriptionEn: "The member opens the link on their own phone, verifies their personal mobile number or email with an OTP, and sets their own password. The profile status updates to 'Verified by Self' and becomes locked (`ownerLocked`).",
        descriptionHi: "सदस्य अपने फोन पर लिंक खोलते हैं, अपने मोबाइल या ईमेल पर ओटीपी सत्यापित करते हैं और अपना पासवर्ड बनाते हैं। प्रोफाइल 'Verified by Self' होकर सुरक्षित हो जाती है।",
        keyPoints: [
          "Member now controls their own contact visibility and personal biography",
          "Prevents anyone else (even the household head) from altering their personal contact info",
          "Member still remains proudly linked under the family household lineage",
        ],
      },
    ],
    primaryCta: {
      label: "Go to Member Dashboard (डैशबोर्ड खोलें) →",
      href: "/dashboard",
    },
    faqs: [
      {
        qEn: "Can minor children claim their profile?",
        qHi: "क्या छोटे बच्चे अपनी प्रोफाइल क्लेम कर सकते हैं?",
        aEn: "No. Children under 18 remain safely managed under their Head of Household until they come of age.",
        aHi: "नहीं। 18 वर्ष से कम आयु के बच्चे सुरक्षा कारणों से अपने परिवार के मुखिया के संरक्षण में ही रहते हैं।",
      },
    ],
  },

  // 4. Directory Search
  {
    id: "directory",
    icon: "🔍",
    nameEn: "18 Gotras Directory Search",
    nameHi: "18 गोत्र निर्देशिका खोज",
    taglineEn: "How to search, filter, and discover Agarwal families worldwide with privacy protection",
    taglineHi: "गोपनीयता सुरक्षा के साथ विश्वभर के अग्रवाल परिवारों को खोजने की विधि",
    flowchartNodes: [
      { id: "1", labelEn: "1. Open /directory", labelHi: "निर्देशिका पृष्ठ खोलें", type: "start" },
      { id: "2", labelEn: "2. Filter 18 Gotras", labelHi: "18 गोत्र में से चुनें", type: "process" },
      { id: "3", labelEn: "3. Filter Location / Near Me", labelHi: "स्थान या Near Me फ़िल्टर", type: "process" },
      { id: "4", labelEn: "4. View Public Cards", labelHi: "संक्षिप्त प्रोफाइल देखें", type: "process" },
      { id: "5", labelEn: "5. Safe Contact Reveal", labelHi: "सुरक्षित संपर्क प्रकटीकरण", type: "success" },
    ],
    steps: [
      {
        stepNumber: 1,
        titleEn: "Step 1: Filter by 18 Established Gotras",
        titleHi: "चरण 1: 18 गोत्रों के आधार पर फ़िल्टर करें",
        descriptionEn: "Go to the Directory (/directory). Select any of the 18 canonical Gotras (e.g. Garg, Bansal, Jindal, Mittal, Singhal, Goyal...) to see verified community families of that lineage.",
        descriptionHi: "निर्देशिका (/directory) पर जाएं। 18 गोत्रों (गर्ग, बंसल, जिंदल, मित्तल, सिंघल, गोयल आदि) में से कोई भी गोत्र चुनकर उस कुल के सत्यापित परिवारों को देखें।",
        keyPoints: [
          "Strict Gotra validation ensures only authentic Agarwal lineage records are displayed",
          "Filter by ancestral native place (मूल निवास) to find relatives from your native state or village",
        ],
      },
      {
        stepNumber: 2,
        titleEn: "Step 2: Location & 'Near Me' Radius Search",
        titleHi: "चरण 2: स्थान एवं 'Near Me' (निकटवर्ती) खोज",
        descriptionEn: "Filter by city or country (e.g. Singapore, Delhi, Mumbai, London, Dubai), or click 'Near Me' to discover Agarwal families living in your immediate vicinity using GPS coordinates.",
        descriptionHi: "शहर या देश (सिंगापुर, दिल्ली, मुंबई, लंदन, दुबई आदि) द्वारा खोजें, या अपने आस-पास रह रहे अग्रवाल परिवारों को देखने के लिए 'Near Me' बटन दबाएं।",
        keyPoints: [
          "Ideal for finding community members when moving to a new city or country",
          "Works seamlessly on both mobile devices and desktop computers",
        ],
        proTipEn: "Allow browser location permission when prompted to enable instant 'Near Me' local radius matching.",
        proTipHi: "निकटवर्ती परिवारों को देखने के लिए ब्राउज़र द्वारा लोकेशन अनुमति मांगने पर 'Allow' करें।",
      },
      {
        stepNumber: 3,
        titleEn: "Step 3: Privacy-Protected Contact Reveal",
        titleHi: "चरण 3: गोपनीयता-सुरक्षित संपर्क विवरण",
        descriptionEn: "To protect community members from telemarketers and scrapers, personal phone numbers and emails are masked. Logged-in verified members can click 'Reveal Contact' under rate-limited security checks.",
        descriptionHi: "स्पैम और अनचाही कॉल्स से सुरक्षा हेतु फोन नंबर व ईमेल छिपाए रहते हैं। सत्यापित लॉग-इन सदस्य सुरक्षा सीमा के अंतर्गत 'Reveal Contact' पर क्लिक कर सकते हैं।",
        keyPoints: [
          "Complies strictly with Singapore PDPA and India DPDP privacy mandates",
          "Members can set their contact visibility to 'Visible to Members' or 'Hidden' at any time",
        ],
      },
    ],
    primaryCta: {
      label: "Search 18 Gotras Directory (निर्देशिका में खोजें) →",
      href: "/directory",
    },
    faqs: [
      {
        qEn: "Can non-members or anonymous visitors view member contact numbers?",
        qHi: "क्या गैर-सदस्य या बिना लॉगिन किए व्यक्ति संपर्क नंबर देख सकते हैं?",
        aEn: "Never. Unauthenticated visitors can only see names and cities. Direct contact information is strictly protected and requires verified community login.",
        aHi: "कदापि नहीं। बिना लॉगिन किए केवल नाम और शहर दिखता है। व्यक्तिगत संपर्क नंबर केवल सत्यापित लॉग-इन सदस्यों के लिए ही उपलब्ध है।",
      },
    ],
  },

  // 5. Private Messaging
  {
    id: "messaging",
    icon: "💬",
    nameEn: "Private Member Messaging",
    nameHi: "सुरक्षित सदस्य संवाद",
    taglineEn: "Connect with verified Agarwal community members safely without sharing phone numbers",
    taglineHi: "बिना फोन नंबर साझा किए समाज के सत्यापित सदस्यों से सुरक्षित बातचीत की सुविधा",
    flowchartNodes: [
      { id: "1", labelEn: "1. Find Member Profile", labelHi: "सदस्य प्रोफाइल खोजें", type: "start" },
      { id: "2", labelEn: "2. Click 'Send Message'", labelHi: "'Send Message' दबाएं", type: "process" },
      { id: "3", labelEn: "3. Write Introduction", labelHi: "परिचय संदेश लिखें", type: "process" },
      { id: "4", labelEn: "4. Recipient Accepts / Declines", labelHi: "प्राप्तकर्ता स्वीकार/अस्वीकार", type: "decision" },
      { id: "5", labelEn: "5. Real-Time Chat Active", labelHi: "सुरक्षित चैट सक्रिय", type: "success" },
    ],
    steps: [
      {
        stepNumber: 1,
        titleEn: "Step 1: Sending an Introductory Connection Request",
        titleHi: "चरण 1: परिचयात्मक संवाद अनुरोध भेजना",
        descriptionEn: "When viewing any member in the directory, click the 'Message' button. Write a respectful introductory message introducing yourself, your Gotra, and the reason for connecting.",
        descriptionHi: "निर्देशिका में किसी भी सदस्य की प्रोफाइल पर 'Message' बटन दबाएं। अपना परिचय, गोत्र और संपर्क का उद्देश्य लिखते हुए सादर संदेश भेजें।",
        keyPoints: [
          "Initial conversation is marked as 'Pending' until the recipient accepts",
          "Protects members from uninvited spam or aggressive cold messages",
        ],
      },
      {
        stepNumber: 2,
        titleEn: "Step 2: Reviewing Incoming Requests in Messages Tab",
        titleHi: "चरण 2: 'Messages' टैब में आए अनुरोधों की समीक्षा",
        descriptionEn: "When someone messages you, a badge appears on your top bar 'Messages' icon. You can preview their verified name, household serial number, Gotra, and choose to 'Accept' or 'Decline'.",
        descriptionHi: "जब कोई आपको संदेश भेजता है, तो शीर्ष मेनू के 'Messages' आइकन पर सूचना दिखती है। आप उनका नाम, सीरियल नंबर व गोत्र देखकर अनुरोध स्वीकार या अस्वीकार कर सकते हैं।",
        keyPoints: [
          "Declining a request quietly closes the conversation without awkward confrontation",
          "Accepting enables real-time messaging directly on the web portal",
        ],
      },
      {
        stepNumber: 3,
        titleEn: "Step 3: Community Safety, Moderation & Reporting",
        titleHi: "चरण 3: समाज सुरक्षा एवं अभद्र संदेशों की रिपोर्टिंग",
        descriptionEn: "If anyone sends inappropriate content, commercial solicitations, or harassment, click the '🚩 Report Message' button. An immutable snapshot is sent immediately to the Foundation Secretariat for disciplinary action.",
        descriptionHi: "यदि कोई अनुचित सामग्री, अवांछित प्रचार या अभद्र भाषा का प्रयोग करे, तो '🚩 Report Message' दबाएं। सचिवालय तुरंत जांच कर आवश्यक कार्रवाई करेगा।",
        keyPoints: [
          "Violators are subject to permanent directory suspension and legal reporting",
          "Ensures our community space remains cultured, noble, and safe for women and elders",
        ],
      },
    ],
    primaryCta: {
      label: "Open My Messages (संदेश देखें) →",
      href: "/dashboard/messages",
    },
    faqs: [
      {
        qEn: "Can other members see my WhatsApp or phone number during chat?",
        qHi: "क्या चैट के दौरान अन्य सदस्यों को मेरा व्हाट्सएप या फोन नंबर दिखता है?",
        aEn: "No. Chats take place entirely inside our secure portal. Your private phone number is never revealed unless you choose to share it.",
        aHi: "नहीं। बातचीत पूरी तरह पोर्टल के सुरक्षित चैट सिस्टम में होती है। आपका फोन नंबर कभी प्रकट नहीं होता।",
      },
    ],
  },

  // 6. Support & Helpline
  {
    id: "support",
    icon: "❓",
    nameEn: "Support & Helpline",
    nameHi: "सहायता केंद्र एवं हेल्पलाइन",
    taglineEn: "How to get help with registration, Gotra revisions, claim invites, or reach the Secretariat",
    taglineHi: "पंजीकरण, गोत्र संशोधन, प्रोफाइल क्लेम या सचिवालय से संपर्क करने की पूरी जानकारी",
    flowchartNodes: [
      { id: "1", labelEn: "1. Check FAQ / Help", labelHi: "FAQ या गाइड देखें", type: "start" },
      { id: "2", labelEn: "2. Submit Ticket on /support", labelHi: "टिकट दर्ज करें (/support)", type: "process" },
      { id: "3", labelEn: "3. Auto Ref #INQ-2026-XXXX", labelHi: "संदर्भ संख्या प्राप्त करें", type: "process" },
      { id: "4", labelEn: "4. Secretariat Resolution", labelHi: "सचिवालय द्वारा समाधान", type: "success" },
    ],
    steps: [
      {
        stepNumber: 1,
        titleEn: "Step 1: Check the Self-Service Help Center",
        titleHi: "चरण 1: सहायता केंद्र में सामान्य प्रश्नों के उत्तर देखें",
        descriptionEn: "Visit /help to view answers categorized by Registration, Moderation, Profile Claiming, Privacy, and Account Settings. Most common questions are answered immediately.",
        descriptionHi: "/help पर जाकर पंजीकरण, सत्यापन, प्रोफाइल क्लेम और गोपनीयता से जुड़े सामान्य प्रश्नों के त्वरित उत्तर देखें।",
        keyPoints: [
          "Searchable FAQ accordion categorized for quick browsing",
          "Available 24/7 without waiting for a volunteer response",
        ],
      },
      {
        stepNumber: 2,
        titleEn: "Step 2: Submit an Inquiry Ticket (/support)",
        titleHi: "चरण 2: सहायता डेस्क पर टिकट दर्ज करें (/support)",
        descriptionEn: "If you need personal assistance with a rejected submission, Gotra correction, or technical issue, go to /support. Fill in your name, email, issue category, and message.",
        descriptionHi: "यदि आपको विशेष सहायता, गोत्र संशोधन या तकनीकी मदद चाहिए, तो /support पर जाकर अपना नाम, ईमेल, श्रेणी और समस्या का विवरण लिखें।",
        keyPoints: [
          "Instantly generates an official Ticket Reference ID (#INQ-2026-XXXX)",
          "An email confirmation receipt is automatically dispatched to your inbox",
          "Foundation administrators review and follow up within 1-2 business days",
        ],
      },
      {
        stepNumber: 3,
        titleEn: "Step 3: Direct WhatsApp Helpline with Secretariat",
        titleHi: "चरण 3: सचिवालय से सीधा व्हाट्सएप संपर्क",
        descriptionEn: "For urgent matters or elder guidance, click the WhatsApp button to chat directly with Shri Sohan Lal Jindal ('Singapore Wale'), Founder & Chairman, at +65 9277 4444.",
        descriptionHi: "अति आवश्यक कार्य या वरिष्ठजनों की सहायता हेतु, व्हाट्सएप बटन दबाकर संस्थापक एवं अध्यक्ष श्री सोहन लाल जिंदल ('सिंगापुर वाले') से सीधे +65 9277 4444 पर चैट करें।",
        keyPoints: [
          "Direct dial Helpline: +65 9277 4444",
          "Official Email: contact@maharajaagrasenfoundation.com",
          "Pre-composed respectful greeting ready in WhatsApp",
        ],
        proTipEn: "Always include your Household Reference Code (#AGR-2026-XXX) or Inquiry Ticket ID for faster resolution.",
        proTipHi: "त्वरित समाधान हेतु संदेश में अपना परिवार कोड (#AGR-2026-XXX) या टिकट नंबर अवश्य लिखें।",
      },
    ],
    primaryCta: {
      label: "Open Support Desk (सहायता डेस्क खोलें) →",
      href: "/support",
    },
    secondaryCta: {
      label: "Chat on WhatsApp: +65 9277 4444",
      href: "https://wa.me/6592774444?text=Jai%20Shree%20Agrasen%20Ji%20%F0%9F%99%8F%0AI%20need%20assistance%20regarding%20the%20Maharaja%20Agrasen%20Foundation%20portal.",
      isExternal: true,
    },
    faqs: [
      {
        qEn: "What are the secretariat response hours?",
        qHi: "सचिवालय से उत्तर प्राप्त होने का समय क्या है?",
        aEn: "Our team operates across Singapore (SGT) and India (IST) time zones. Digital tickets are resolved within 24 to 48 business hours.",
        aHi: "हमारी टीम सिंगापुर और भारत के समय अनुसार कार्य करती है। डिजिटल टिकटों का समाधान 24 से 48 कार्य घंटों में किया जाता है।",
      },
    ],
  },

  // 7. Matrimonial Portal
  {
    id: "matrimony",
    icon: "💍",
    nameEn: "Matrimonial Portal",
    nameHi: "अग्रवाल वैवाहिक संबंध मंच",
    taglineEn: "How approved members discover Agarwal life partners and register candidate biodatas safely",
    taglineHi: "सत्यापित अग्रवाल परिवारों में वर-वधू की खोज एवं सुरक्षित बायोडाटा पंजीकरण की प्रक्रिया",
    flowchartNodes: [
      { id: "1", labelEn: "1. Admin Approval", labelHi: "प्रशासनिक स्वीकृति", type: "start" },
      { id: "2", labelEn: "2. Select Member", labelHi: "सदस्य चयन (Auto-fill)", type: "process" },
      { id: "3", labelEn: "3. Career & Photos", labelHi: "शिक्षा, व्यवसाय व फोटो", type: "process" },
      { id: "4", labelEn: "4. Link Family Members", labelHi: "माता-पिता प्रोफाइल लिंक", type: "process" },
      { id: "5", labelEn: "5. Automated Security Alert", labelHi: "स्वचालित सुरक्षा सूचना", type: "decision" },
      { id: "6", labelEn: "6. Published in Matrimony", labelHi: "बायोडाटा प्रकाशित", type: "success" },
    ],
    steps: [
      {
        stepNumber: 1,
        titleEn: "Step 1: Admin Approval & Member Requirement",
        titleHi: "चरण 1: प्रशासनिक सत्यापन एवं सदस्य अनिवार्यता",
        descriptionEn: "To protect community families from fraudulent listings and commercial brokers, only households approved by administrators (status = 'live') can access the matrimonial directory or create candidate profiles. Both creator and candidate must be registered members.",
        descriptionHi: "फर्जी प्रोफाइल और दलालों से सुरक्षा हेतु, केवल प्रशासनिक रूप से स्वीकृत (Live) परिवार ही वैवाहिक मंच देख सकते हैं या प्रोफाइल बना सकते हैं। प्रोफाइल बनाने वाले और प्रत्याशी दोनों का सदस्य होना अनिवार्य है।",
        keyPoints: [
          "100% verified Gotra lineage and household authentication",
          "Unauthenticated visitors and pending accounts are strictly barred from viewing candidates",
          "Ensures authentic matrimonial alliances within the cultured Agarwal community",
        ],
      },
      {
        stepNumber: 2,
        titleEn: "Step 2: Candidate Selection & Instant Auto-Fill",
        titleHi: "चरण 2: प्रत्याशी सदस्य चयन एवं स्वतः विवरण पूर्ति",
        descriptionEn: "Go to /matrimony/create and select an eligible unmarried adult member from your household. Their verified Name, DOB, Gotra, Native Place (मूल निवास), and contact info auto-populate instantly.",
        descriptionHi: "/matrimony/create पर जाकर अपने परिवार के अविवाहित वयस्क सदस्य को चुनें। उनका नाम, जन्मतिथि, गोत्र, मूल निवास और संपर्क विवरण स्वतः भर जाता है।",
        keyPoints: [
          "Eliminates duplicate manual typing and human error",
          "Prevents unauthorized users from registering someone outside their own family",
          "Fill remaining details: Height, Diet, Qualification, Occupation, and 2-3 Photographs",
        ],
      },
      {
        stepNumber: 3,
        titleEn: "Step 3: Interactive Family Linking & Directory Verification",
        titleHi: "चरण 3: माता-पिता प्रोफाइल लिंक एवं निर्देशिका सत्यापन",
        descriptionEn: "When adding Father, Mother, or Siblings, select their existing member profile from your household. On the public biodata, visitors can click their name to open their complete directory profile (/directory/[id]) to verify family background.",
        descriptionHi: "माताजी, पिताजी या भाई-बहन का विवरण भरते समय उनका सदस्य प्रोफाइल लिंक करें। बायोडाटा में उनके नाम पर क्लिक कर स्वजन सीधे निर्देशिका में उनकी पूरी पारिवारिक पृष्ठभूमि देख सकते हैं।",
        keyPoints: [
          "Unique community feature providing complete transparent family verification",
          "Add dynamic custom fields (e.g. Visa status, property ownership, cultural talents)",
          "Uploaded photos are optimized and compressed automatically for quick browsing",
        ],
      },
      {
        stepNumber: 4,
        titleEn: "Step 4: Dual Ownership, Anti-Spoofing & Self-Governance",
        titleHi: "चरण 4: दोहरा स्वामित्व एवं प्रत्याशी का स्व-नियंत्रण",
        descriptionEn: "Upon creation, automated email alerts are sent to the candidate and linked parents. The candidate retains full authority on their dashboard to edit details, pause profile visibility (hide), or delete the profile once an alliance is settled.",
        descriptionHi: "प्रोफाइल बनते ही प्रत्याशी और माता-पिता को ईमेल द्वारा सूचित किया जाता है। प्रत्याशी को अपने डैशबोर्ड पर प्रोफाइल संपादित करने, अस्थाई रूप से छिपाने या रिश्ता तय होने पर हटाने का पूरा अधिकार रहता है।",
        keyPoints: [
          "Only one active profile permitted per member (no duplicates)",
          "Outside users cannot edit, tamper with, or delete someone else's profile",
          "Single-click 'Pause Visibility' hides profile when discussions are underway",
        ],
      },
    ],
    primaryCta: {
      label: "Open Matrimonial Directory (वैवाहिक मंच) →",
      href: "/matrimony",
    },
    secondaryCta: {
      label: "+ Register Candidate Profile (बायोडाटा बनाएं)",
      href: "/matrimony/create",
    },
    faqs: [
      {
        qEn: "Can someone outside our household create a matrimonial profile for my son or daughter?",
        qHi: "क्या हमारे परिवार के बाहर का कोई व्यक्ति मेरे बेटे या बेटी का प्रोफाइल बना सकता है?",
        aEn: "Strictly impossible. The system verifies household ownership before creation. A user can only register profiles for members listed under their own verified household.",
        aHi: "कदापि नहीं। सिस्टम केवल उसी परिवार के सदस्यों के लिए प्रोफाइल बनाने की अनुमति देता है। कोई बाहरी व्यक्ति किसी अन्य का प्रोफाइल नहीं बना सकता।",
      },
      {
        qEn: "What happens if both parent and candidate create a profile from different emails?",
        qHi: "यदि माता-पिता और स्वयं प्रत्याशी अलग-अलग ईमेल से प्रोफाइल बनाएं तो क्या होगा?",
        aEn: "Each member has exactly one unique matrimonial record. If a parent creates it first, the candidate is emailed and gets full co-ownership on their dashboard. Duplicate profiles are automatically prevented.",
        aHi: "प्रत्येक सदस्य का केवल एक ही बायोडाटा हो सकता है। यदि माता-पिता पहले बनाते हैं, तो प्रत्याशी को ईमेल मिल जाता है और वे अपने डैशबोर्ड से उसे नियंत्रित कर सकते हैं।",
      },
      {
        qEn: "How do we pause or remove a profile once marriage is fixed?",
        qHi: "विवाह तय होने पर हम प्रोफाइल को कैसे हटाएं या छिपाएं?",
        aEn: "Both the candidate and household head can click 'Pause Profile' or 'Delete' directly from the candidate detail view or household dashboard.",
        aHi: "प्रत्याशी या परिवार के मुखिया सीधे बायोडाटा पृष्ठ या डैशबोर्ड से 'Pause Profile' या 'Delete' बटन दबाकर प्रोफाइल को छिपा या हटा सकते हैं।",
      },
    ],
  },
];

export default function UserGuidePage() {
  const [activeTopicId, setActiveTopicId] = useState("registration");
  const [flowchartMode, setFlowchartMode] = useState<"visual" | "steps">("visual");

  const currentTopic =
    GUIDE_TOPICS.find((t) => t.id === activeTopicId) || GUIDE_TOPICS[0];

  return (
    <main className="py-8 sm:py-12 bg-canvas-page min-h-screen overflow-x-hidden">
      <div className="max-w-6xl mx-auto px-3.5 sm:px-6 w-full">
        
        {/* Page Header */}
        <div className="text-center mb-8 sm:mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full va-badge-gold text-xs font-bold mb-3 shadow-xs">
            <span>📖</span>
            <span>User Guide &amp; Flowcharts • उपयोग निर्देशिका</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-brand-primary leading-tight break-words">
            How to Use the Agarwal Global Directory
          </h1>
          <p className="text-sm sm:text-base text-brand-gold font-semibold mt-1 font-devanagari">
            अग्रवाल ग्लोबल डायरेक्टरी का उपयोग कैसे करें • सम्पूर्ण मार्गदर्शिका
          </p>
          <p className="text-xs sm:text-sm text-body-muted max-w-2xl mx-auto mt-2 leading-relaxed">
            Visual step-by-step guides and process flowcharts for registering your family, claiming individual member profiles, searching the 18 Gotras directory, and private messaging.
          </p>
        </div>

        {/* Topic Selector: Grid on Mobile (No cut-off items), Centered Wrap on Desktop */}
        <div className="w-full mb-8">
          {/* Mobile 2-Column Grid */}
          <div className="grid grid-cols-2 sm:hidden gap-2">
            {GUIDE_TOPICS.map((topic) => {
              const isActive = topic.id === activeTopicId;
              return (
                <button
                  key={topic.id}
                  type="button"
                  onClick={() => setActiveTopicId(topic.id)}
                  className={`flex items-center gap-2 p-2.5 rounded-2xl text-xs font-bold transition-all border text-left shadow-xs ${
                    isActive
                      ? "bg-brand-primary text-white border-brand-primary shadow-warm scale-[1.01]"
                      : "bg-white text-body-heading border-brand-accent/30 hover:border-brand-primary/50 hover:bg-canvas-warm/40"
                  }`}
                >
                  <span className="text-lg shrink-0">{topic.icon}</span>
                  <span className="truncate leading-tight">{topic.nameEn}</span>
                </button>
              );
            })}
          </div>

          {/* Desktop & Tablet Centered Flex Wrap */}
          <div className="hidden sm:flex flex-wrap items-center justify-center gap-2.5">
            {GUIDE_TOPICS.map((topic) => {
              const isActive = topic.id === activeTopicId;
              return (
                <button
                  key={topic.id}
                  type="button"
                  onClick={() => setActiveTopicId(topic.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all border shadow-xs ${
                    isActive
                      ? "bg-brand-primary text-white border-brand-primary shadow-warm scale-[1.02]"
                      : "bg-white text-body-heading border-brand-accent/30 hover:border-brand-primary/50 hover:bg-canvas-warm/40"
                  }`}
                >
                  <span className="text-base">{topic.icon}</span>
                  <span>{topic.nameEn}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Active Topic Header Card */}
        <div className="bg-white border-2 border-brand-accent/40 rounded-3xl p-4 sm:p-6 md:p-8 shadow-warm mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-brand-accent/20">
            <div className="min-w-0">
              <div className="flex items-start sm:items-center gap-2.5">
                <span className="text-3xl shrink-0">{currentTopic.icon}</span>
                <div className="min-w-0">
                  <h2 className="text-xl sm:text-2xl font-black text-brand-primary break-words">
                    {currentTopic.nameEn}
                  </h2>
                  <p className="text-xs sm:text-sm font-bold text-brand-gold font-devanagari">
                    {currentTopic.nameHi}
                  </p>
                </div>
              </div>
              <p className="text-xs text-body-muted mt-2 leading-relaxed break-words">
                {currentTopic.taglineEn} • <span className="font-devanagari">{currentTopic.taglineHi}</span>
              </p>
            </div>

            {/* Quick Action Button in Header */}
            <div className="shrink-0 flex items-center w-full md:w-auto">
              <Link
                href={currentTopic.primaryCta.href}
                className="w-full md:w-auto text-center px-5 py-2.5 rounded-full text-xs font-bold text-white va-btn-join shadow-goldCta transition-all inline-flex items-center justify-center gap-1.5 break-words"
              >
                <span>{currentTopic.primaryCta.label}</span>
              </Link>
            </div>
          </div>

          {/* Flowchart Section */}
          <div className="pt-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-brand-primary flex items-center gap-1.5">
                <span>🔄</span>
                <span>Process Flowchart • प्रक्रिया प्रवाह आरेख</span>
              </span>
              
              {/* Dual Mode View Switcher */}
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <span className="text-[11px] text-body-muted hidden md:inline">
                  View mode:
                </span>
                <div className="inline-flex rounded-xl bg-canvas-warm p-0.5 border border-brand-accent/30 text-xs">
                  <button
                    type="button"
                    onClick={() => setFlowchartMode("visual")}
                    className={`px-3 py-1 rounded-lg font-bold transition-all ${
                      flowchartMode === "visual"
                        ? "bg-brand-primary text-white shadow-xs"
                        : "text-body-text hover:text-brand-primary"
                    }`}
                  >
                    ↔ Wide Chart
                  </button>
                  <button
                    type="button"
                    onClick={() => setFlowchartMode("steps")}
                    className={`px-3 py-1 rounded-lg font-bold transition-all ${
                      flowchartMode === "steps"
                        ? "bg-brand-primary text-white shadow-xs"
                        : "text-body-text hover:text-brand-primary"
                    }`}
                  >
                    ↕ Step Map
                  </button>
                </div>
              </div>
            </div>

            {/* Mode 1: Wide Responsive Flowchart with Scroll Cue */}
            {flowchartMode === "visual" && (
              <div className="relative">
                <p className="text-[11px] text-brand-gold font-semibold mb-2 flex items-center gap-1.5 sm:hidden">
                  <span>👉</span>
                  <span>Swipe horizontally to view all workflow nodes</span>
                </p>

                <div className="bg-canvas-warm/40 border border-brand-accent/30 rounded-2xl p-4 sm:p-6 overflow-x-auto">
                  <div className="flex items-center justify-between gap-2.5 min-w-[660px] pr-6 py-1">
                    {currentTopic.flowchartNodes.map((node, idx) => {
                      const isLast = idx === currentTopic.flowchartNodes.length - 1;
                      const nodeBg =
                        node.type === "start"
                          ? "bg-amber-100 text-amber-900 border-amber-300"
                          : node.type === "success"
                          ? "bg-emerald-100 text-emerald-900 border-emerald-300 shadow-xs"
                          : node.type === "decision"
                          ? "bg-purple-100 text-purple-900 border-purple-300"
                          : "bg-white text-brand-primary border-brand-accent/40 shadow-xs";

                      return (
                        <React.Fragment key={node.id}>
                          <div
                            className={`flex-1 min-w-[125px] max-w-[155px] px-3.5 py-3 rounded-2xl border text-center transition-transform hover:scale-[1.02] ${nodeBg}`}
                          >
                            <div className="text-[9px] font-extrabold uppercase tracking-wider mb-1 opacity-75">
                              {node.type === "start" && "● START"}
                              {node.type === "process" && `STEP ${idx + 1}`}
                              {node.type === "decision" && "◆ DECISION"}
                              {node.type === "success" && "✓ COMPLETE"}
                            </div>
                            <p className="text-xs font-black leading-tight break-words">
                              {node.labelEn}
                            </p>
                            <p className="text-[10px] font-semibold text-body-muted mt-1 font-devanagari leading-tight break-words">
                              {node.labelHi}
                            </p>
                          </div>
                          {!isLast && (
                            <div className="text-brand-accent shrink-0 text-base font-black select-none px-1">
                              ➔
                            </div>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Mode 2: Vertical Connected Step Map (Optimal for Mobile Viewports) */}
            {flowchartMode === "steps" && (
              <div className="bg-canvas-warm/40 border border-brand-accent/30 rounded-2xl p-4 sm:p-6">
                <div className="space-y-2.5 max-w-xl mx-auto">
                  {currentTopic.flowchartNodes.map((node, idx) => {
                    const isLast = idx === currentTopic.flowchartNodes.length - 1;
                    const nodeBadgeColor =
                      node.type === "start"
                        ? "bg-amber-500 text-white"
                        : node.type === "success"
                        ? "bg-emerald-600 text-white"
                        : node.type === "decision"
                        ? "bg-purple-600 text-white"
                        : "bg-brand-primary text-white";

                    return (
                      <div key={node.id} className="relative">
                        <div className="flex items-center gap-3.5 bg-white border border-brand-accent/30 rounded-2xl p-3.5 shadow-xs">
                          <div className={`w-8 h-8 rounded-xl ${nodeBadgeColor} font-black text-xs flex items-center justify-center shrink-0 shadow-xs`}>
                            {node.type === "start" ? "1" : node.type === "success" ? "✓" : node.type === "decision" ? "◆" : idx + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-xs sm:text-sm font-black text-brand-primary break-words">
                                {node.labelEn}
                              </p>
                              <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-canvas-warm text-body-muted border border-brand-accent/20 shrink-0">
                                {node.type}
                              </span>
                            </div>
                            <p className="text-[11px] font-semibold text-body-muted font-devanagari mt-0.5 break-words">
                              {node.labelHi}
                            </p>
                          </div>
                        </div>

                        {!isLast && (
                          <div className="flex justify-center my-1">
                            <div className="w-0.5 h-4 bg-brand-accent/40 relative">
                              <div className="absolute -bottom-1 -left-[3px] text-brand-accent text-[9px]">▼</div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Step-by-Step Illustrated Cards */}
        <div className="space-y-6 mb-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h3 className="text-base sm:text-lg font-black text-body-heading flex items-center gap-2">
              <span>📋</span>
              <span>
                Detailed Step-by-Step Instructions{" "}
                <span className="text-xs sm:text-sm font-normal text-brand-gold font-devanagari block sm:inline">
                  • विस्तृत चरण-दर-चरण निर्देश
                </span>
              </span>
            </h3>
            <span className="text-xs font-bold text-brand-primary self-start sm:self-auto">
              {currentTopic.steps.length} Steps
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:gap-6">
            {currentTopic.steps.map((step) => (
              <div
                key={step.stepNumber}
                className="bg-white border-2 border-brand-accent/30 rounded-3xl p-4 sm:p-6 md:p-7 shadow-warm hover:border-brand-primary/40 transition-all"
              >
                <div className="flex items-start gap-3.5 sm:gap-4">
                  {/* Step Number Badge */}
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-br from-brand-primary to-brand-accent text-white font-black text-sm sm:text-base flex items-center justify-center shrink-0 shadow-sm">
                    {step.stepNumber}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <div className="min-w-0">
                        <h4 className="text-sm sm:text-base font-black text-brand-primary leading-tight break-words">
                          {step.titleEn}
                        </h4>
                        <p className="text-xs font-bold text-brand-gold font-devanagari mt-0.5 break-words">
                          {step.titleHi}
                        </p>
                      </div>
                      {step.badge && (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full va-badge-gold shrink-0">
                          {step.badge}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-body-text leading-relaxed mb-3 break-words">
                      {step.descriptionEn}
                    </p>
                    <p className="text-xs text-body-muted leading-relaxed mb-4 font-devanagari bg-canvas-warm/30 p-2.5 rounded-xl border border-brand-accent/20 break-words">
                      {step.descriptionHi}
                    </p>

                    {/* Key Checklist Points */}
                    {step.keyPoints.length > 0 && (
                      <div className="mb-4">
                        <p className="text-[11px] font-extrabold text-body-heading uppercase tracking-wider mb-2">
                          Key Checklist / मुख्य बिंदु:
                        </p>
                        <ul className="space-y-1.5">
                          {step.keyPoints.map((point, pIdx) => (
                            <li key={pIdx} className="text-xs text-body-text flex items-start gap-2 break-words">
                              <span className="text-emerald-600 font-bold shrink-0">✓</span>
                              <span className="break-words">{point}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Pro Tip Callout */}
                    {step.proTipEn && (
                      <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 text-xs text-amber-950 flex items-start gap-2.5">
                        <span className="text-base shrink-0">💡</span>
                        <div className="min-w-0 break-words">
                          <strong>Pro Tip:</strong> {step.proTipEn}
                          {step.proTipHi && (
                            <span className="block text-[11px] text-amber-900/90 mt-1 font-devanagari break-words">
                              <strong>सुझाव:</strong> {step.proTipHi}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Topic Specific FAQs */}
        {currentTopic.faqs.length > 0 && (
          <div className="bg-white border border-brand-accent/30 rounded-3xl p-4 sm:p-6 md:p-8 shadow-warm mb-10">
            <h3 className="text-sm font-black text-brand-primary uppercase tracking-wider mb-4 flex items-center gap-2 border-b border-brand-accent/20 pb-2">
              <span>❓</span>
              <span>Frequently Asked Regarding this Process • संबंधित प्रश्न</span>
            </h3>

            <div className="space-y-4 divide-y divide-brand-accent/15">
              {currentTopic.faqs.map((faq, idx) => (
                <div key={idx} className={idx > 0 ? "pt-4" : ""}>
                  <p className="text-xs font-bold text-body-heading mb-0.5 break-words">
                    Q: {faq.qEn}
                  </p>
                  <p className="text-[11px] font-semibold text-brand-gold font-devanagari mb-1.5 break-words">
                    प्र: {faq.qHi}
                  </p>
                  <p className="text-xs text-body-muted leading-relaxed break-words">
                    {faq.aEn}
                  </p>
                  <p className="text-xs text-body-muted/90 leading-relaxed font-devanagari mt-1 break-words">
                    {faq.aHi}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bottom CTA & Support Bar */}
        <div className="bg-gradient-to-r from-[#7a1818] via-[#a12820] to-[#b8381e] text-white rounded-3xl p-5 sm:p-8 shadow-warm flex flex-col sm:flex-row items-center justify-between gap-5 sm:gap-6">
          <div className="text-center sm:text-left min-w-0">
            <h3 className="text-lg font-black leading-tight">
              Ready to take action?
            </h3>
            <p className="text-xs text-amber-100 mt-1 break-words">
              Follow this flow to join the global family or explore verified Agarwal households worldwide.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full sm:w-auto shrink-0">
            <Link
              href={currentTopic.primaryCta.href}
              className="w-full sm:w-auto text-center px-6 py-2.5 rounded-full text-xs font-bold bg-white text-brand-primary hover:bg-amber-50 shadow-md transition-all break-words"
            >
              {currentTopic.primaryCta.label}
            </Link>

            {currentTopic.secondaryCta && (
              currentTopic.secondaryCta.isExternal ? (
                <a
                  href={currentTopic.secondaryCta.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto text-center px-4 py-2.5 rounded-full text-xs font-bold bg-white/15 hover:bg-white/25 text-white border border-white/30 transition-all inline-flex items-center justify-center gap-1.5 break-words"
                >
                  {currentTopic.secondaryCta.label}
                </a>
              ) : (
                <Link
                  href={currentTopic.secondaryCta.href}
                  className="w-full sm:w-auto text-center px-4 py-2.5 rounded-full text-xs font-bold bg-white/15 hover:bg-white/25 text-white border border-white/30 transition-all break-words"
                >
                  {currentTopic.secondaryCta.label}
                </Link>
              )
            )}
          </div>
        </div>

        {/* Still Need Assistance Banner */}
        <div className="mt-8 text-center text-xs text-body-muted">
          <p className="break-words">
            Still have questions or need assistance? Reach our Secretariat on WhatsApp:{" "}
            <a
              href="https://wa.me/6592774444"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-[#075E54] hover:underline"
            >
              +65 9277 4444
            </a>{" "}
            or submit a ticket at{" "}
            <Link href="/support" className="font-bold text-brand-primary hover:underline">
              Support Desk (/support)
            </Link>
          </p>
        </div>

      </div>
    </main>
  );
}
