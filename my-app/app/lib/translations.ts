/**
 * English/Sinhala display-text dictionaries for the public landing page,
 * the login page (and the shared AuthShell panel it renders inside), and
 * the Settings "Language" card. Consumed via `useLanguage().t` from
 * `LanguageProvider`. Not a full site-wide i18n pass — only these surfaces
 * are wired up to it so far.
 */

const en = {
  nav: {
    about: "About",
    features: "Features",
    getStarted: "Get started",
    login: "Log in",
    signup: "Sign up",
  },
  hero: {
    eyebrow: "Digital Paddy Ecosystem for Sri Lanka",
    titleBefore: "One platform connecting every step of the ",
    titleAccent: "paddy journey",
    titleAfter: "",
    subtitle:
      "From the farmer's field to the warehouse floor, Smart PMB brings guaranteed pricing, digital purchasing, and AI-powered insights to Sri Lanka's paddy purchasing network.",
    loginCta: "Log in",
    farmerCta: "Register as a Farmer",
    partnerCta: "Register as a Purchaser/Mill Owner",
    scrollAria: "Scroll to learn more",
  },
  about: {
    eyebrow: "Overview",
    heading: "Modernizing how Sri Lanka grows, sells, and moves paddy",
    body: "Sri Lanka's paddy sector still depends heavily on manual paperwork and disconnected workflows. Farmers struggle to get real-time guaranteed prices, track sales, or reach purchasing centers, while PMB officers face difficulty monitoring nationwide stock, warehouses, and rice mill licensing. Smart PMB replaces that patchwork with one centralized system — mobile apps, web dashboards, AI-powered analytics, and a secure database working together to make every step transparent and traceable.",
    stats: [
      { before: "Manual paperwork", after: "Digital records for every transaction" },
      { before: "Delayed farmer payments", after: "Real-time payment tracking" },
      { before: "Disconnected systems", after: "One connected platform, nationwide" },
    ],
  },
  features: {
    eyebrow: "Features",
    heading: "Every module the paddy supply chain needs",
    subheading:
      "Purpose-built modules for farmers, purchasers, mills, warehouses, logistics, and nationwide analytics — all under one roof.",
    items: [
      {
        title: "Farmer Dashboard",
        text: "Submit harvests, view guaranteed prices, and track paddy sales and payments in real time.",
      },
      {
        title: "Digital Purchasing",
        text: "Purchase approvals, transaction verification, and QR-based digital receipts for every sale.",
      },
      {
        title: "Warehouse Management",
        text: "Real-time inventory tracking, capacity monitoring, and spoilage reporting across depots.",
      },
      {
        title: "Rice Mill Management",
        text: "License applications, inspection records, and milling reports in one place.",
      },
      {
        title: "Transport & Logistics",
        text: "Vehicle assignments, GPS delivery tracking, and route monitoring for every shipment.",
      },
      {
        title: "AI Analytics",
        text: "Price forecasting, yield prediction, crop disease detection, and nationwide reporting.",
      },
    ],
  },
  cta: {
    eyebrow: "Get started",
    heading: "One secure sign-in for every role",
    subheading:
      "Farmers, PMB officers, purchasers, and administrators all sign in from the same place — you'll land on the dashboard built for your role automatically.",
    login: "Log in",
    farmer: "Register as a Farmer",
    partner: "Register as a Purchaser/Mill Owner",
  },
  footer: {
    tagline:
      "A digital ecosystem platform connecting farmers, purchasers, mills, warehouses, and logistics across Sri Lanka's paddy industry.",
    platformHeading: "Platform",
    about: "About",
    features: "Features",
    getStarted: "Get started",
    accessHeading: "Access",
    login: "Log in",
    farmerSignup: "Farmer sign up",
    partnerSignup: "Purchaser/Mill owner sign up",
    copyright: "Digital Paddy Ecosystem for Sri Lanka.",
  },
  authShell: {
    tagline: "Track your harvest. Know your price. Get paid on time.",
    subtext: "The digital home for Sri Lanka's paddy purchasing network.",
    features: [
      "Log every harvest in seconds",
      "See guaranteed prices before you sell",
      "Track collection and delivery status",
    ],
  },
  login: {
    title: "Welcome back",
    subtitle: "Log in to your Smart PMB account.",
    registeredBanner: "Account created! Check your email for a confirmation link, then log in below.",
    resetBanner: "Password reset. Log in with your new password below.",
    emailLabel: "Email",
    passwordLabel: "Password",
    forgotPassword: "Forgot password?",
    loggingIn: "Logging in…",
    submit: "Log in",
    farmerPrompt: "Farmer without an account?",
    signUp: "Sign up",
    partnerPrompt: "Authorized purchaser or mill owner?",
    applyLicense: "Apply for a license",
  },
  settingsLanguage: {
    title: "Language",
    subtitle: "Choose the display language for Smart PMB.",
    label: "Display language",
    english: "English",
    sinhala: "Sinhala",
  },
  toggle: {
    languageAria: "Switch language",
  },
};

const si: typeof en = {
  nav: {
    about: "අප ගැන",
    features: "විශේෂාංග",
    getStarted: "ආරම්භ කරන්න",
    login: "පිවිසෙන්න",
    signup: "ලියාපදිංචි වන්න",
  },
  hero: {
    eyebrow: "ශ්‍රී ලංකාවේ ඩිජිටල් වී පරිසර පද්ධතිය",
    titleBefore: "",
    titleAccent: "වී ගමන",
    titleAfter: " වෙනුවෙන් සෑම පියවරක්ම සම්බන්ධ කරන එකම වේදිකාව",
    subtitle:
      "ගොවි කුඹුරේ සිට ගබඩා මහල දක්වා, ස්මාර්ට් PMB ශ්‍රී ලංකාවේ වී මිලදී ගැනීමේ ජාලයට සහතික මිල ගණන්, ඩිජිටල් මිලදී ගැනීම් සහ AI බලයෙන් ක්‍රියාත්මක විශ්ලේෂණ ලබා දෙයි.",
    loginCta: "පිවිසෙන්න",
    farmerCta: "ගොවියෙකු ලෙස ලියාපදිංචි වන්න",
    partnerCta: "මිලදී ගන්නෙකු/මෝල හිමිකරුවෙකු ලෙස ලියාපදිංචි වන්න",
    scrollAria: "තව දැනගැනීමට පහළට යන්න",
  },
  about: {
    eyebrow: "දළ විශ්ලේෂණය",
    heading: "ශ්‍රී ලංකාව වී වගා කරන, විකුණන සහ ප්‍රවාහනය කරන ආකාරය නවීකරණය කිරීම",
    body: "ශ්‍රී ලංකාවේ වී අංශය තවමත් අතින් සිදුකරන ලේඛන කටයුතු සහ එකිනෙකට සම්බන්ධ නොවූ ක්‍රියාවලීන් මත දැඩි ලෙස රඳා පවතී. ගොවීන්ට තථ්‍ය කාලීන සහතික මිල ගණන් ලබාගැනීමට, විකුණුම් නිරීක්ෂණය කිරීමට හෝ මිලදී ගැනීමේ මධ්‍යස්ථානවලට ළඟාවීමට අපහසුතාවයට පත්වන අතර, වී අලෙවි මණ්ඩල නිලධාරීන්ට රටපුරා තොග, ගබඩා සහ සහල් මෝල් බලපත්‍ර නිරීක්ෂණය කිරීමේදී දුෂ්කරතා ඇති වේ. ස්මාර්ට් PMB එම විසිරුණු ක්‍රම වෙනුවට එක්සත් පද්ධතියක් ලබා දෙයි — ජංගම යෙදුම්, වෙබ් උපකරණ පුවරු, AI බලයෙන් ක්‍රියාත්මක විශ්ලේෂණ සහ ආරක්ෂිත දත්ත සමුදායක් එකට ක්‍රියාත්මක වී සෑම පියවරක්ම විනිවිද පෙනෙන සහ සොයාගත හැකි කරයි.",
    stats: [
      { before: "අත්පිට ලේඛන කටයුතු", after: "සෑම ගනුදෙනුවකටම ඩිජිටල් වාර්තා" },
      { before: "ප්‍රමාද වූ ගොවි ගෙවීම්", after: "තථ්‍ය කාලීන ගෙවීම් නිරීක්ෂණය" },
      { before: "එකිනෙකට සම්බන්ධ නොවූ පද්ධති", after: "රටපුරා එකට සම්බන්ධ එකම වේදිකාව" },
    ],
  },
  features: {
    eyebrow: "විශේෂාංග",
    heading: "වී සැපයුම් දාමයට අවශ්‍ය සෑම මොඩියුලයක්ම",
    subheading:
      "ගොවීන්, මිලදී ගන්නන්, මෝල්, ගබඩා, ප්‍රවාහනය සහ රටපුරා විශ්ලේෂණ සඳහා විශේෂයෙන් නිර්මාණය කළ මොඩියුල — සියල්ල එක් වහලක් යටතේ.",
    items: [
      {
        title: "ගොවි උපකරණ පුවරුව",
        text: "අස්වැන්න ඉදිරිපත් කරන්න, සහතික මිල ගණන් බලන්න, සහ වී විකුණුම් හා ගෙවීම් තථ්‍ය කාලීනව නිරීක්ෂණය කරන්න.",
      },
      {
        title: "ඩිජිටල් මිලදී ගැනීම",
        text: "මිලදී ගැනීම් අනුමැතීන්, ගනුදෙනු තහවුරු කිරීම, සහ සෑම විකිණීමකටම QR පාදක ඩිජිටල් රිසිට්පත්.",
      },
      {
        title: "ගබඩා කළමනාකරණය",
        text: "තථ්‍ය කාලීන තොග නිරීක්ෂණය, ධාරිතා පරීක්ෂණය, සහ ගබඩා පුරා විනාශ වීම් වාර්තා කිරීම.",
      },
      {
        title: "සහල් මෝල් කළමනාකරණය",
        text: "බලපත්‍ර අයදුම්පත්, පරීක්ෂණ වාර්තා, සහ මෝල් කිරීමේ වාර්තා එකම තැනකින්.",
      },
      {
        title: "ප්‍රවාහනය සහ ලොජිස්ටික්ස්",
        text: "වාහන පැවරීම්, GPS බෙදාහැරීම් නිරීක්ෂණය, සහ සෑම තොගයක් සඳහාම මාර්ග නිරීක්ෂණය.",
      },
      {
        title: "AI විශ්ලේෂණ",
        text: "මිල පුරෝකථනය, අස්වැන්න පුරෝකථනය, බෝග රෝග හඳුනාගැනීම, සහ රටපුරා වාර්තා කිරීම.",
      },
    ],
  },
  cta: {
    eyebrow: "ආරම්භ කරන්න",
    heading: "සෑම භූමිකාවකටම එක් ආරක්ෂිත පිවිසුමක්",
    subheading:
      "ගොවීන්, වී අලෙවි මණ්ඩල නිලධාරීන්, මිලදී ගන්නන් සහ පරිපාලකයන් සියල්ලෝම එකම ස්ථානයෙන් පිවිසෙති — ඔබ ස්වයංක්‍රීයව ඔබේ භූමිකාව සඳහා නිර්මාණය කළ උපකරණ පුවරුවට යොමු වේ.",
    login: "පිවිසෙන්න",
    farmer: "ගොවියෙකු ලෙස ලියාපදිංචි වන්න",
    partner: "මිලදී ගන්නෙකු/මෝල හිමිකරුවෙකු ලෙස ලියාපදිංචි වන්න",
  },
  footer: {
    tagline:
      "ශ්‍රී ලංකාවේ වී කර්මාන්තය පුරා ගොවීන්, මිලදී ගන්නන්, මෝල්, ගබඩා සහ ප්‍රවාහනය සම්බන්ධ කරන ඩිජිටල් පරිසර පද්ධති වේදිකාවකි.",
    platformHeading: "වේදිකාව",
    about: "අප ගැන",
    features: "විශේෂාංග",
    getStarted: "ආරම්භ කරන්න",
    accessHeading: "පිවිසුම",
    login: "පිවිසෙන්න",
    farmerSignup: "ගොවි ලියාපදිංචිය",
    partnerSignup: "මිලදී ගන්නා/මෝල හිමිකරු ලියාපදිංචිය",
    copyright: "ශ්‍රී ලංකාවේ ඩිජිටල් වී පරිසර පද්ධතිය.",
  },
  authShell: {
    tagline: "ඔබේ අස්වැන්න නිරීක්ෂණය කරන්න. ඔබේ මිල දැනගන්න. නියමිත වේලාවට ගෙවීම් ලබාගන්න.",
    subtext: "ශ්‍රී ලංකාවේ වී මිලදී ගැනීමේ ජාලය සඳහා ඩිජිටල් නිවහන.",
    features: [
      "තත්පර කිහිපයකින් සෑම අස්වැන්නක්ම ලියාපදිංචි කරන්න",
      "විකිණීමට පෙර සහතික මිල ගණන් බලන්න",
      "එකතු කිරීම සහ බෙදාහැරීමේ තත්ත්වය නිරීක්ෂණය කරන්න",
    ],
  },
  login: {
    title: "නැවත සාදරයෙන් පිළිගනිමු",
    subtitle: "ඔබේ ස්මාර්ට් PMB ගිණුමට පිවිසෙන්න.",
    registeredBanner: "ගිණුම සාදන ලදී! තහවුරු කිරීමේ සබැඳිය සඳහා ඔබේ විද්‍යුත් තැපෑල පරීක්ෂා කර, පහතින් පිවිසෙන්න.",
    resetBanner: "මුරපදය යළි පිහිටුවන ලදී. පහතින් ඔබේ නව මුරපදය සමඟ පිවිසෙන්න.",
    emailLabel: "විද්‍යුත් තැපෑල",
    passwordLabel: "මුරපදය",
    forgotPassword: "මුරපදය අමතකද?",
    loggingIn: "පිවිසෙමින්…",
    submit: "පිවිසෙන්න",
    farmerPrompt: "ගිණුමක් නැති ගොවියෙක්ද?",
    signUp: "ලියාපදිංචි වන්න",
    partnerPrompt: "බලයලත් මිලදී ගන්නෙක් හෝ මෝල් හිමිකරුවෙක්ද?",
    applyLicense: "බලපත්‍රයක් සඳහා අයදුම් කරන්න",
  },
  settingsLanguage: {
    title: "භාෂාව",
    subtitle: "ස්මාර්ට් PMB සඳහා දර්ශන භාෂාව තෝරන්න.",
    label: "දර්ශන භාෂාව",
    english: "ඉංග්‍රීසි",
    sinhala: "සිංහල",
  },
  toggle: {
    languageAria: "භාෂාව මාරු කරන්න",
  },
};

export const translations = { en, si };
export type Translations = typeof en;
