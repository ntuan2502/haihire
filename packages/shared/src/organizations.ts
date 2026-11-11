export { Role } from "./permissions";
export type { Role as RoleType } from "./permissions";
import type { Role } from "./permissions";

export const InviteStatus = {
  ACTIVE: "ACTIVE",
  EXPIRED: "EXPIRED",
  REVOKED: "REVOKED",
} as const;
export type InviteStatus = (typeof InviteStatus)[keyof typeof InviteStatus];

export const SUPPORTED_ORG_LANGUAGES = ["vi", "en"] as const;
export type OrgLanguage = (typeof SUPPORTED_ORG_LANGUAGES)[number];

export const SUPPORTED_DATE_FORMATS = [
  "DD/MM/YYYY",
  "MM/DD/YYYY",
  "YYYY-MM-DD",
] as const;
export type DateFormat = (typeof SUPPORTED_DATE_FORMATS)[number];

export const SUPPORTED_TIME_FORMATS = ["24H", "12H"] as const;
export type TimeFormat = (typeof SUPPORTED_TIME_FORMATS)[number];

export const SUPPORTED_NAME_DISPLAY_ORDERS = [
  "FIRST_LAST",
  "LAST_FIRST",
] as const;
export type NameDisplayOrder = (typeof SUPPORTED_NAME_DISPLAY_ORDERS)[number];

export const SUPPORTED_CURRENCIES = [
  "VND",
  "USD",
  "EUR",
  "SGD",
  "JPY",
] as const;
export type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number];

export interface TimezoneOption {
  value: string;
  offsetMinutes: number;
  offsetLabel: string;
  cityLabel: string;
  keywords: string;
}

interface CanonicalTimezoneGroup {
  value: string;
  cityLabel: string;
  aliases: readonly string[];
  keywords?: string;
}

const CANONICAL_TIMEZONE_GROUPS: readonly CanonicalTimezoneGroup[] = [
  {
    value: "Etc/GMT+12",
    cityLabel: "International Date Line West",
    aliases: [],
  },
  {
    value: "Pacific/Midway",
    cityLabel: "Midway Island, American Samoa",
    aliases: ["Pacific/Pago_Pago", "Pacific/Niue"],
  },
  {
    value: "Pacific/Honolulu",
    cityLabel: "Hawaii",
    aliases: ["Pacific/Rarotonga", "Pacific/Tahiti", "US/Hawaii"],
  },
  {
    value: "America/Adak",
    cityLabel: "Aleutian Islands",
    aliases: ["US/Aleutian"],
  },
  {
    value: "Pacific/Marquesas",
    cityLabel: "Marquesas Islands",
    aliases: [],
  },
  {
    value: "America/Anchorage",
    cityLabel: "Alaska",
    aliases: [
      "America/Juneau",
      "America/Nome",
      "America/Sitka",
      "America/Yakutat",
      "US/Alaska",
    ],
  },
  {
    value: "Pacific/Gambier",
    cityLabel: "Gambier Islands",
    aliases: [],
  },
  {
    value: "America/Los_Angeles",
    cityLabel: "Pacific Time (US & Canada), Los Angeles, Vancouver",
    aliases: [
      "America/Vancouver",
      "America/Tijuana",
      "US/Pacific",
      "Canada/Pacific",
    ],
    keywords: "Seattle San Francisco San Diego Tijuana PST PDT",
  },
  {
    value: "Pacific/Pitcairn",
    cityLabel: "Pitcairn Islands",
    aliases: [],
  },
  {
    value: "America/Denver",
    cityLabel: "Mountain Time (US & Canada), Denver, Calgary",
    aliases: [
      "America/Edmonton",
      "America/Boise",
      "America/Ciudad_Juarez",
      "US/Mountain",
      "Canada/Mountain",
    ],
    keywords: "Salt Lake City Albuquerque Edmonton MST MDT",
  },
  {
    value: "America/Phoenix",
    cityLabel: "Arizona, Hermosillo, Yukon",
    aliases: [
      "America/Hermosillo",
      "America/Mazatlan",
      "America/Whitehorse",
      "America/Dawson_Creek",
      "America/Fort_Nelson",
      "US/Arizona",
    ],
  },
  {
    value: "America/Chicago",
    cityLabel: "Central Time (US & Canada), Chicago, Winnipeg",
    aliases: [
      "America/Winnipeg",
      "America/Matamoros",
      "America/Ojinaga",
      "US/Central",
      "Canada/Central",
    ],
    keywords: "Dallas Houston Austin Minneapolis CST CDT",
  },
  {
    value: "America/Mexico_City",
    cityLabel: "Guadalajara, Mexico City, Monterrey",
    aliases: [
      "America/Monterrey",
      "America/Merida",
      "America/Chihuahua",
      "Mexico/General",
    ],
  },
  {
    value: "America/Guatemala",
    cityLabel: "Central America, Guatemala, San Jose, Regina",
    aliases: [
      "America/Belize",
      "America/Costa_Rica",
      "America/El_Salvador",
      "America/Managua",
      "America/Tegucigalpa",
      "America/Regina",
      "Canada/Saskatchewan",
      "Pacific/Galapagos",
    ],
  },
  {
    value: "Pacific/Easter",
    cityLabel: "Easter Island",
    aliases: ["Chile/EasterIsland"],
  },
  {
    value: "America/New_York",
    cityLabel: "Eastern Time (US & Canada), New York, Toronto",
    aliases: [
      "America/Toronto",
      "America/Detroit",
      "America/Indiana/Indianapolis",
      "America/Indianapolis",
      "America/Kentucky/Louisville",
      "America/Louisville",
      "America/Montreal",
      "America/Nassau",
      "US/Eastern",
      "Canada/Eastern",
    ],
    keywords: "Boston Miami Washington Atlanta Ottawa EST EDT",
  },
  {
    value: "America/Bogota",
    cityLabel: "Bogota, Lima, Quito, Panama",
    aliases: [
      "America/Lima",
      "America/Guayaquil",
      "America/Panama",
      "America/Jamaica",
      "America/Cancun",
      "America/Cayman",
      "America/Rio_Branco",
    ],
  },
  {
    value: "America/Havana",
    cityLabel: "Havana",
    aliases: ["Cuba"],
  },
  {
    value: "America/Port-au-Prince",
    cityLabel: "Port-au-Prince (Haiti)",
    aliases: ["America/Grand_Turk"],
  },
  {
    value: "America/Halifax",
    cityLabel: "Atlantic Time (Canada), Halifax, Bermuda",
    aliases: [
      "America/Moncton",
      "America/Glace_Bay",
      "Atlantic/Bermuda",
      "Canada/Atlantic",
    ],
  },
  {
    value: "America/Caracas",
    cityLabel: "Caracas",
    aliases: [],
  },
  {
    value: "America/La_Paz",
    cityLabel: "Georgetown, La Paz, Manaus, San Juan",
    aliases: [
      "America/Manaus",
      "America/Puerto_Rico",
      "America/Santo_Domingo",
      "America/Barbados",
      "America/Guyana",
      "America/Port_of_Spain",
      "America/Martinique",
      "America/Cuiaba",
      "America/Campo_Grande",
    ],
  },
  {
    value: "America/Santiago",
    cityLabel: "Santiago",
    aliases: ["Chile/Continental"],
  },
  {
    value: "America/St_Johns",
    cityLabel: "Newfoundland",
    aliases: ["Canada/Newfoundland"],
  },
  {
    value: "America/Sao_Paulo",
    cityLabel: "Brasilia, Sao Paulo",
    aliases: [
      "America/Fortaleza",
      "America/Recife",
      "America/Bahia",
      "America/Belem",
      "America/Maceio",
      "America/Araguaina",
      "Brazil/East",
    ],
  },
  {
    value: "America/Argentina/Buenos_Aires",
    cityLabel: "Buenos Aires, Montevideo, Asuncion",
    aliases: [
      "America/Buenos_Aires",
      "America/Argentina/Cordoba",
      "America/Cordoba",
      "America/Argentina/Catamarca",
      "America/Catamarca",
      "America/Argentina/Jujuy",
      "America/Jujuy",
      "America/Argentina/Mendoza",
      "America/Mendoza",
      "America/Asuncion",
      "America/Montevideo",
      "America/Paramaribo",
      "America/Cayenne",
      "Atlantic/Stanley",
    ],
  },
  {
    value: "America/Punta_Arenas",
    cityLabel: "Punta Arenas",
    aliases: [],
  },
  {
    value: "America/Miquelon",
    cityLabel: "Saint Pierre and Miquelon",
    aliases: [],
  },
  {
    value: "America/Nuuk",
    cityLabel: "Greenland (Nuuk)",
    aliases: ["America/Godthab"],
  },
  {
    value: "America/Noronha",
    cityLabel: "Fernando de Noronha, South Georgia",
    aliases: ["Atlantic/South_Georgia"],
  },
  {
    value: "Atlantic/Azores",
    cityLabel: "Azores",
    aliases: [],
  },
  {
    value: "Atlantic/Cape_Verde",
    cityLabel: "Cabo Verde",
    aliases: [],
  },
  {
    value: "UTC",
    cityLabel: "Coordinated Universal Time",
    aliases: ["Etc/UTC", "Etc/GMT", "GMT"],
  },
  {
    value: "Europe/London",
    cityLabel: "Dublin, Edinburgh, Lisbon, London",
    aliases: [
      "Europe/Dublin",
      "Europe/Lisbon",
      "Atlantic/Canary",
      "Atlantic/Faroe",
      "Atlantic/Faeroe",
      "Atlantic/Madeira",
      "Europe/Guernsey",
      "Europe/Jersey",
    ],
    keywords: "UK Britain GMT BST Portugal Ireland",
  },
  {
    value: "Africa/Casablanca",
    cityLabel: "Casablanca",
    aliases: ["Africa/El_Aaiun"],
  },
  {
    value: "Atlantic/Reykjavik",
    cityLabel: "Monrovia, Reykjavik, Accra, Dakar",
    aliases: [
      "Africa/Abidjan",
      "Africa/Accra",
      "Africa/Dakar",
      "Africa/Bamako",
      "Africa/Conakry",
      "Africa/Freetown",
      "Africa/Monrovia",
      "Africa/Nouakchott",
    ],
  },
  {
    value: "Europe/Paris",
    cityLabel: "Amsterdam, Berlin, Brussels, Madrid, Paris, Rome",
    aliases: [
      "Europe/Berlin",
      "Europe/Amsterdam",
      "Europe/Brussels",
      "Europe/Madrid",
      "Europe/Rome",
      "Europe/Zurich",
      "Europe/Luxembourg",
      "Europe/Monaco",
      "Europe/Stockholm",
      "Europe/Oslo",
      "Europe/Copenhagen",
      "Europe/Malta",
    ],
    keywords:
      "Frankfurt Munich Milan Barcelona Geneva Sweden Norway Denmark CET CEST",
  },
  {
    value: "Europe/Warsaw",
    cityLabel: "Belgrade, Bratislava, Budapest, Prague, Vienna, Warsaw",
    aliases: [
      "Europe/Belgrade",
      "Europe/Bratislava",
      "Europe/Budapest",
      "Europe/Prague",
      "Europe/Vienna",
      "Europe/Ljubljana",
      "Europe/Sarajevo",
      "Europe/Skopje",
      "Europe/Zagreb",
    ],
    keywords: "Poland Czechia Austria Hungary Serbia Croatia Slovakia CET CEST",
  },
  {
    value: "Africa/Lagos",
    cityLabel: "West Central Africa, Lagos, Algiers, Tunis",
    aliases: [
      "Africa/Algiers",
      "Africa/Tunis",
      "Africa/Douala",
      "Africa/Kinshasa",
      "Africa/Luanda",
      "Africa/Niamey",
      "Africa/Libreville",
    ],
  },
  {
    value: "Europe/Athens",
    cityLabel: "Athens, Bucharest, Chisinau",
    aliases: ["Europe/Bucharest", "Europe/Chisinau"],
    keywords: "Greece Romania Moldova EET EEST",
  },
  {
    value: "Europe/Kyiv",
    cityLabel: "Helsinki, Kyiv, Riga, Sofia, Tallinn, Vilnius",
    aliases: [
      "Europe/Kiev",
      "Europe/Helsinki",
      "Europe/Riga",
      "Europe/Sofia",
      "Europe/Tallinn",
      "Europe/Vilnius",
      "Asia/Nicosia",
    ],
    keywords:
      "Ukraine Finland Bulgaria Estonia Latvia Lithuania Cyprus EET EEST",
  },
  {
    value: "Africa/Cairo",
    cityLabel: "Cairo",
    aliases: [],
  },
  {
    value: "Asia/Jerusalem",
    cityLabel: "Jerusalem",
    aliases: ["Asia/Tel_Aviv"],
    keywords: "Tel Aviv Israel",
  },
  {
    value: "Asia/Beirut",
    cityLabel: "Beirut",
    aliases: [],
  },
  {
    value: "Europe/Kaliningrad",
    cityLabel: "Kaliningrad",
    aliases: [],
  },
  {
    value: "Africa/Johannesburg",
    cityLabel: "Harare, Johannesburg, Pretoria",
    aliases: [
      "Africa/Harare",
      "Africa/Maputo",
      "Africa/Gaborone",
      "Africa/Lusaka",
      "Africa/Kigali",
      "Africa/Windhoek",
      "Africa/Tripoli",
      "Africa/Khartoum",
    ],
    keywords: "Cape Town South Africa Zimbabwe SAST CAT",
  },
  {
    value: "Europe/Istanbul",
    cityLabel: "Istanbul",
    aliases: ["Asia/Istanbul"],
    keywords: "Ankara Turkey Turkiye",
  },
  {
    value: "Europe/Moscow",
    cityLabel: "Moscow, St. Petersburg, Minsk",
    aliases: ["Europe/Minsk", "Europe/Volgograd"],
  },
  {
    value: "Asia/Riyadh",
    cityLabel: "Baghdad, Doha, Kuwait, Riyadh",
    aliases: [
      "Asia/Baghdad",
      "Asia/Qatar",
      "Asia/Kuwait",
      "Asia/Bahrain",
      "Asia/Aden",
    ],
    keywords: "Saudi Arabia Iraq Qatar Yemen AST",
  },
  {
    value: "Asia/Amman",
    cityLabel: "Amman, Damascus",
    aliases: ["Asia/Damascus"],
  },
  {
    value: "Africa/Nairobi",
    cityLabel: "Addis Ababa, Nairobi, Kampala",
    aliases: [
      "Africa/Addis_Ababa",
      "Africa/Dar_es_Salaam",
      "Africa/Kampala",
      "Africa/Mogadishu",
      "Africa/Asmara",
      "Africa/Asmera",
      "Indian/Antananarivo",
    ],
    keywords: "Kenya Ethiopia Tanzania Uganda EAT",
  },
  {
    value: "Asia/Tehran",
    cityLabel: "Tehran",
    aliases: [],
  },
  {
    value: "Asia/Dubai",
    cityLabel: "Abu Dhabi, Dubai, Muscat",
    aliases: [
      "Asia/Muscat",
      "Indian/Mauritius",
      "Indian/Reunion",
      "Indian/Mahe",
    ],
    keywords: "UAE United Arab Emirates Oman GST",
  },
  {
    value: "Asia/Baku",
    cityLabel: "Baku",
    aliases: [],
  },
  {
    value: "Asia/Tbilisi",
    cityLabel: "Tbilisi",
    aliases: [],
  },
  {
    value: "Asia/Yerevan",
    cityLabel: "Yerevan",
    aliases: [],
  },
  {
    value: "Europe/Samara",
    cityLabel: "Samara, Saratov",
    aliases: ["Europe/Saratov", "Europe/Astrakhan", "Europe/Ulyanovsk"],
  },
  {
    value: "Asia/Kabul",
    cityLabel: "Kabul",
    aliases: [],
  },
  {
    value: "Asia/Karachi",
    cityLabel: "Islamabad, Karachi",
    aliases: [],
    keywords: "Pakistan PKT",
  },
  {
    value: "Asia/Tashkent",
    cityLabel: "Almaty, Astana, Tashkent, Dushanbe",
    aliases: [
      "Asia/Almaty",
      "Asia/Qyzylorda",
      "Asia/Ashgabat",
      "Asia/Dushanbe",
      "Asia/Samarkand",
    ],
    keywords: "Kazakhstan Uzbekistan Tajikistan Turkmenistan",
  },
  {
    value: "Asia/Yekaterinburg",
    cityLabel: "Yekaterinburg",
    aliases: [],
  },
  {
    value: "Indian/Maldives",
    cityLabel: "Maldives, Male",
    aliases: [],
  },
  {
    value: "Asia/Kolkata",
    cityLabel: "Chennai, Kolkata, Mumbai, New Delhi",
    aliases: ["Asia/Calcutta"],
    keywords: "Bengaluru Bangalore India IST",
  },
  {
    value: "Asia/Colombo",
    cityLabel: "Sri Jayawardenepura (Colombo)",
    aliases: [],
    keywords: "Sri Lanka",
  },
  {
    value: "Asia/Kathmandu",
    cityLabel: "Kathmandu",
    aliases: ["Asia/Katmandu"],
    keywords: "Nepal",
  },
  {
    value: "Asia/Dhaka",
    cityLabel: "Dhaka, Thimphu",
    aliases: ["Asia/Thimphu"],
    keywords: "Bangladesh Bhutan",
  },
  {
    value: "Asia/Bishkek",
    cityLabel: "Bishkek",
    aliases: [],
  },
  {
    value: "Asia/Omsk",
    cityLabel: "Omsk",
    aliases: [],
  },
  {
    value: "Asia/Yangon",
    cityLabel: "Yangon (Rangoon)",
    aliases: ["Asia/Rangoon", "Indian/Cocos"],
    keywords: "Myanmar Burma",
  },
  {
    value: "Asia/Ho_Chi_Minh",
    cityLabel: "Bangkok, Hanoi, Ho Chi Minh City, Jakarta",
    aliases: [
      "Asia/Saigon",
      "Asia/Bangkok",
      "Asia/Jakarta",
      "Asia/Phnom_Penh",
      "Asia/Vientiane",
      "Asia/Pontianak",
      "Indian/Christmas",
    ],
    keywords:
      "Hà Nội Hồ Chí Minh Sài Gòn Saigon Viet Nam Vietnam Thailand Indonesia Cambodia Laos ICT WIB",
  },
  {
    value: "Asia/Novosibirsk",
    cityLabel: "Krasnoyarsk, Novosibirsk, Tomsk",
    aliases: [
      "Asia/Krasnoyarsk",
      "Asia/Tomsk",
      "Asia/Barnaul",
      "Asia/Novokuznetsk",
      "Asia/Hovd",
    ],
  },
  {
    value: "Asia/Singapore",
    cityLabel: "Kuala Lumpur, Singapore",
    aliases: ["Asia/Kuala_Lumpur", "Asia/Brunei", "Asia/Kuching"],
    keywords: "Malaysia Brunei SGT MYT",
  },
  {
    value: "Asia/Shanghai",
    cityLabel: "Beijing, Chongqing, Hong Kong, Shanghai",
    aliases: ["Asia/Hong_Kong", "Asia/Macau"],
    keywords: "Shenzhen Guangzhou China CST HKT",
  },
  {
    value: "Asia/Taipei",
    cityLabel: "Taipei",
    aliases: [],
    keywords: "Taiwan",
  },
  {
    value: "Asia/Manila",
    cityLabel: "Manila, Makassar",
    aliases: ["Asia/Makassar"],
    keywords: "Philippines WITA",
  },
  {
    value: "Australia/Perth",
    cityLabel: "Perth",
    aliases: ["Australia/West"],
  },
  {
    value: "Asia/Irkutsk",
    cityLabel: "Irkutsk, Ulaanbaatar",
    aliases: ["Asia/Ulaanbaatar", "Asia/Choibalsan"],
  },
  {
    value: "Australia/Eucla",
    cityLabel: "Eucla",
    aliases: [],
  },
  {
    value: "Asia/Tokyo",
    cityLabel: "Osaka, Sapporo, Tokyo",
    aliases: ["Japan"],
    keywords: "Japan JST",
  },
  {
    value: "Asia/Seoul",
    cityLabel: "Seoul, Pyongyang",
    aliases: ["Asia/Pyongyang"],
    keywords: "Korea KST",
  },
  {
    value: "Asia/Yakutsk",
    cityLabel: "Chita, Jayapura, Yakutsk, Dili",
    aliases: [
      "Asia/Chita",
      "Asia/Khandyga",
      "Asia/Jayapura",
      "Asia/Dili",
      "Pacific/Palau",
    ],
  },
  {
    value: "Australia/Darwin",
    cityLabel: "Darwin",
    aliases: ["Australia/North"],
  },
  {
    value: "Australia/Adelaide",
    cityLabel: "Adelaide",
    aliases: ["Australia/Broken_Hill", "Australia/South"],
  },
  {
    value: "Australia/Brisbane",
    cityLabel: "Brisbane",
    aliases: ["Australia/Lindeman", "Australia/Queensland"],
  },
  {
    value: "Australia/Sydney",
    cityLabel: "Canberra, Melbourne, Sydney, Hobart",
    aliases: [
      "Australia/Melbourne",
      "Australia/Hobart",
      "Australia/Canberra",
      "Australia/NSW",
    ],
    keywords: "AEST AEDT Australia",
  },
  {
    value: "Pacific/Port_Moresby",
    cityLabel: "Guam, Port Moresby",
    aliases: [
      "Pacific/Guam",
      "Pacific/Saipan",
      "Pacific/Chuuk",
      "Pacific/Truk",
    ],
  },
  {
    value: "Asia/Vladivostok",
    cityLabel: "Vladivostok",
    aliases: ["Asia/Ust-Nera"],
  },
  {
    value: "Australia/Lord_Howe",
    cityLabel: "Lord Howe Island",
    aliases: [],
  },
  {
    value: "Pacific/Noumea",
    cityLabel: "New Caledonia, Solomon Islands",
    aliases: [
      "Pacific/Guadalcanal",
      "Pacific/Efate",
      "Pacific/Pohnpei",
      "Pacific/Ponape",
      "Pacific/Kosrae",
      "Pacific/Bougainville",
    ],
  },
  {
    value: "Asia/Magadan",
    cityLabel: "Magadan, Sakhalin",
    aliases: ["Asia/Sakhalin", "Asia/Srednekolymsk"],
  },
  {
    value: "Pacific/Norfolk",
    cityLabel: "Norfolk Island",
    aliases: [],
  },
  {
    value: "Pacific/Auckland",
    cityLabel: "Auckland, Wellington",
    aliases: ["NZ"],
    keywords: "New Zealand NZST NZDT",
  },
  {
    value: "Pacific/Fiji",
    cityLabel: "Fiji",
    aliases: [],
  },
  {
    value: "Asia/Kamchatka",
    cityLabel: "Anadyr, Kamchatka, Marshall Islands",
    aliases: [
      "Asia/Anadyr",
      "Pacific/Tarawa",
      "Pacific/Majuro",
      "Pacific/Funafuti",
      "Pacific/Nauru",
      "Pacific/Wake",
      "Pacific/Wallis",
    ],
  },
  {
    value: "Pacific/Chatham",
    cityLabel: "Chatham Islands",
    aliases: ["NZ-CHAT"],
  },
  {
    value: "Pacific/Tongatapu",
    cityLabel: "Nuku'alofa, Tonga, Tokelau",
    aliases: ["Pacific/Fakaofo", "Pacific/Kanton", "Pacific/Enderbury"],
  },
  {
    value: "Pacific/Apia",
    cityLabel: "Samoa (Apia)",
    aliases: [],
  },
  {
    value: "Pacific/Kiritimati",
    cityLabel: "Kiritimati (Line Islands)",
    aliases: [],
  },
];

const CLDR_LEGACY_TO_MODERN_IANA: Readonly<Record<string, string>> = {
  "Africa/Asmera": "Africa/Asmara",
  "America/Buenos_Aires": "America/Argentina/Buenos_Aires",
  "America/Catamarca": "America/Argentina/Catamarca",
  "America/Cordoba": "America/Argentina/Cordoba",
  "America/Godthab": "America/Nuuk",
  "America/Indianapolis": "America/Indiana/Indianapolis",
  "America/Jujuy": "America/Argentina/Jujuy",
  "America/Louisville": "America/Kentucky/Louisville",
  "America/Mendoza": "America/Argentina/Mendoza",
  "Asia/Calcutta": "Asia/Kolkata",
  "Asia/Katmandu": "Asia/Kathmandu",
  "Asia/Rangoon": "Asia/Yangon",
  "Asia/Saigon": "Asia/Ho_Chi_Minh",
  "Atlantic/Faeroe": "Atlantic/Faroe",
  "Europe/Kiev": "Europe/Kyiv",
  "Pacific/Enderbury": "Pacific/Kanton",
  "Pacific/Ponape": "Pacific/Pohnpei",
  "Pacific/Truk": "Pacific/Chuuk",
};

const CANONICAL_TIMEZONE_ALIAS_MAP: ReadonlyMap<string, string> = (() => {
  const map = new Map<string, string>();
  for (const group of CANONICAL_TIMEZONE_GROUPS) {
    map.set(group.value, group.value);
    for (const alias of group.aliases) {
      map.set(alias, group.value);
    }
  }
  return map;
})();

const CANONICAL_TIMEZONE_GROUP_MAP: ReadonlyMap<
  string,
  CanonicalTimezoneGroup
> = new Map(CANONICAL_TIMEZONE_GROUPS.map((g) => [g.value, g]));

export function canonicalizeTimezone(timezone: string): string {
  const direct = CANONICAL_TIMEZONE_ALIAS_MAP.get(timezone);
  if (direct) return direct;
  const modern = CLDR_LEGACY_TO_MODERN_IANA[timezone];
  if (modern) {
    return CANONICAL_TIMEZONE_ALIAS_MAP.get(modern) ?? modern;
  }
  return timezone;
}

export function getTimezoneOffsetMinutes(
  timezone: string,
  referenceDate: Date = new Date(),
): number {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      timeZoneName: "longOffset",
    }).formatToParts(referenceDate);
    const rawName =
      parts
        .find((part) => part.type === "timeZoneName")
        ?.value.replace(/\u2212/g, "-") ?? "";

    if (!rawName || rawName === "GMT" || rawName === "UTC") {
      return 0;
    }

    const match = rawName.match(/^(?:GMT|UTC)([+-])(\d{1,2})(?::?(\d{2}))?$/);
    if (!match) return 0;

    const sign = match[1] === "-" ? -1 : 1;
    const hours = Number.parseInt(match[2], 10);
    const minutes = match[3] ? Number.parseInt(match[3], 10) : 0;
    const total = sign * (hours * 60 + minutes);
    return Object.is(total, -0) ? 0 : total;
  } catch {
    return 0;
  }
}

export function formatUtcOffsetLabel(offsetMinutes: number): string {
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const abs = Math.abs(offsetMinutes);
  const hours = String(Math.floor(abs / 60)).padStart(2, "0");
  const mins = String(abs % 60).padStart(2, "0");
  return `UTC${sign}${hours}:${mins}`;
}

export function formatTimezoneCityLabel(timezone: string): string {
  const canonical = canonicalizeTimezone(timezone);
  const group = CANONICAL_TIMEZONE_GROUP_MAP.get(canonical);
  if (group) return group.cityLabel;

  const segments = canonical.split("/");
  if (segments.length <= 1) {
    return canonical.replace(/_/g, " ");
  }
  return segments.slice(1).join(" / ").replace(/_/g, " ");
}

function buildGroupKeywords(group: CanonicalTimezoneGroup): string {
  const aliasCityTokens = group.aliases
    .map((alias) => alias.split("/").slice(1).join(" ").replace(/_/g, " "))
    .filter(Boolean);
  return [
    group.value,
    group.cityLabel,
    ...group.aliases,
    ...aliasCityTokens,
    group.keywords ?? "",
  ]
    .filter(Boolean)
    .join(" ");
}

export function getAllTimezoneOptions(
  referenceDate: Date = new Date(),
): TimezoneOption[] {
  return CANONICAL_TIMEZONE_GROUPS.map((group) => {
    const offsetMinutes = getTimezoneOffsetMinutes(group.value, referenceDate);
    return {
      value: group.value,
      offsetMinutes,
      offsetLabel: formatUtcOffsetLabel(offsetMinutes),
      cityLabel: group.cityLabel,
      keywords: buildGroupKeywords(group),
    };
  }).sort((a, b) => {
    if (a.offsetMinutes !== b.offsetMinutes) {
      return a.offsetMinutes - b.offsetMinutes;
    }
    if (a.value === "UTC" && b.value !== "UTC") return -1;
    if (b.value === "UTC" && a.value !== "UTC") return 1;
    return a.cityLabel.localeCompare(b.cityLabel);
  });
}

export const ORG_TIMEZONE_OPTIONS: readonly TimezoneOption[] =
  getAllTimezoneOptions();

export function formatTimezoneOptionLabel(option: TimezoneOption): string {
  return `(${option.offsetLabel}) ${option.cityLabel}`;
}

export function getTimezoneSelectOptions(
  activeTimezone?: string | null,
): Array<{ value: string; label: string; keywords?: string }> {
  const base: Array<{ value: string; label: string; keywords?: string }> =
    ORG_TIMEZONE_OPTIONS.map((opt) => ({
      value: opt.value,
      label: formatTimezoneOptionLabel(opt),
      keywords: opt.keywords,
    }));

  if (activeTimezone && isValidIanaTimezone(activeTimezone)) {
    const canonical = canonicalizeTimezone(activeTimezone);
    if (!base.some((opt) => opt.value === canonical)) {
      const offsetMinutes = getTimezoneOffsetMinutes(canonical);
      base.unshift({
        value: canonical,
        label: `(${formatUtcOffsetLabel(offsetMinutes)}) ${formatTimezoneCityLabel(canonical)}`,
        keywords: `${activeTimezone} ${canonical}`,
      });
    }
  }
  return base;
}

export function isValidIanaTimezone(timezone: string): boolean {
  if (!timezone || typeof timezone !== "string") return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

export interface OrganizationLocalizationSettings {
  defaultLanguage: OrgLanguage;
  timezone: string;
  dateFormat: DateFormat;
  timeFormat: TimeFormat;
  nameDisplayOrder: NameDisplayOrder;
  defaultCurrency: CurrencyCode;
}

export const DEFAULT_ORG_LOCALIZATION: OrganizationLocalizationSettings = {
  defaultLanguage: "vi",
  timezone: "Asia/Ho_Chi_Minh",
  dateFormat: "DD/MM/YYYY",
  timeFormat: "24H",
  nameDisplayOrder: "FIRST_LAST",
  defaultCurrency: "VND",
};

function isOneOf<T extends string>(
  value: unknown,
  allowed: readonly T[],
): value is T {
  return (
    typeof value === "string" && (allowed as readonly string[]).includes(value)
  );
}

export type RawOrgLocalizationInput = Partial<
  Record<keyof OrganizationLocalizationSettings, unknown>
>;

export function normalizeOrgLocalization(
  org?: RawOrgLocalizationInput | null,
): OrganizationLocalizationSettings {
  if (!org) return { ...DEFAULT_ORG_LOCALIZATION };
  return {
    defaultLanguage: isOneOf(org.defaultLanguage, SUPPORTED_ORG_LANGUAGES)
      ? org.defaultLanguage
      : DEFAULT_ORG_LOCALIZATION.defaultLanguage,
    timezone:
      typeof org.timezone === "string" && isValidIanaTimezone(org.timezone)
        ? canonicalizeTimezone(org.timezone)
        : DEFAULT_ORG_LOCALIZATION.timezone,
    dateFormat: isOneOf(org.dateFormat, SUPPORTED_DATE_FORMATS)
      ? org.dateFormat
      : DEFAULT_ORG_LOCALIZATION.dateFormat,
    timeFormat: isOneOf(org.timeFormat, SUPPORTED_TIME_FORMATS)
      ? org.timeFormat
      : DEFAULT_ORG_LOCALIZATION.timeFormat,
    nameDisplayOrder: isOneOf(
      org.nameDisplayOrder,
      SUPPORTED_NAME_DISPLAY_ORDERS,
    )
      ? org.nameDisplayOrder
      : DEFAULT_ORG_LOCALIZATION.nameDisplayOrder,
    defaultCurrency: isOneOf(org.defaultCurrency, SUPPORTED_CURRENCIES)
      ? org.defaultCurrency
      : DEFAULT_ORG_LOCALIZATION.defaultCurrency,
  };
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  ownerId?: string | null;
  defaultLanguage?: OrgLanguage;
  timezone?: string;
  dateFormat?: DateFormat;
  timeFormat?: TimeFormat;
  nameDisplayOrder?: NameDisplayOrder;
  defaultCurrency?: CurrencyCode;
  createdAt: string;
}

export interface InviteLink {
  id: string;
  token: string;
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  role: Role;
  expiresInDays: number | null;
  expiresAt: string | null;
  maxUses: number | null;
  usesCount: number;
  createdById: string;
  createdByName: string;
  status: InviteStatus;
  createdAt: string;
}

export interface UpdateUserPreferencesPayload {
  preferredLanguage?: OrgLanguage | null;
  preferredTimezone?: string | null;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  isOwner?: boolean;
  avatarUrl?: string | null;
  preferredLanguage?: OrgLanguage | null;
  preferredTimezone?: string | null;
  organizationId?: string | null;
  organization?: Organization | null;
  createdAt: string;
}
