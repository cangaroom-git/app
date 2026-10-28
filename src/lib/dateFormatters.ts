export type LanguageCode = "th" | "en";

export const MONTH_NAMES_TH = [
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม",
] as const;

export const MONTH_NAMES_EN = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

export const SHORT_MONTHS_TH = [
  "ม.ค.",
  "ก.พ.",
  "มี.ค.",
  "เม.ย.",
  "พ.ค.",
  "มิ.ย.",
  "ก.ค.",
  "ส.ค.",
  "ก.ย.",
  "ต.ค.",
  "พ.ย.",
  "ธ.ค.",
] as const;

export const SHORT_MONTHS_EN = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

export const SHORT_DAYS_TH = [
  "อา.",
  "จ.",
  "อ.",
  "พ.",
  "พฤ.",
  "ศ.",
  "ส.",
] as const;

export const SHORT_DAYS_EN = [
  "Sun",
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
] as const;

export function formatShortDate(
  dateString: string,
  language: LanguageCode
): string {
  const parsedDate = new Date(dateString + "T00:00:00");
  if (isNaN(parsedDate.getTime())) {
    return dateString;
  }

  const dayOfMonth = parsedDate.getDate();
  const monthIndex = parsedDate.getMonth();
  const fullYear = parsedDate.getFullYear();

  return language === "th"
    ? `${dayOfMonth} ${SHORT_MONTHS_TH[monthIndex]} ${fullYear + 543}`
    : `${dayOfMonth} ${SHORT_MONTHS_EN[monthIndex]} ${fullYear}`;
}

export function formatNavbarDateCard(
  dateString: string,
  language: LanguageCode
): string {
  if (!dateString) {
    return "-";
  }

  const parsedDate = new Date(dateString + "T00:00:00");
  if (isNaN(parsedDate.getTime())) {
    return dateString;
  }

  const dayOfWeekIndex = parsedDate.getDay();
  const dayOfMonth = parsedDate.getDate();
  const monthIndex = parsedDate.getMonth();

  return language === "th"
    ? `${SHORT_DAYS_TH[dayOfWeekIndex]}, ${dayOfMonth} ${SHORT_MONTHS_TH[monthIndex]}`
    : `${SHORT_DAYS_EN[dayOfWeekIndex]}, ${SHORT_MONTHS_EN[monthIndex]} ${dayOfMonth}`;
}

export function formatStayDateRangePill(
  checkInDateString: string,
  checkOutDateString: string,
  language: LanguageCode
): string {
  const checkInDate = new Date(checkInDateString + "T00:00:00");
  const checkOutDate = new Date(checkOutDateString + "T00:00:00");

  if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
    return `${checkInDateString} – ${checkOutDateString}`;
  }

  const checkInDay = checkInDate.getDate();
  const checkInMonth =
    language === "th"
      ? SHORT_MONTHS_TH[checkInDate.getMonth()]
      : SHORT_MONTHS_EN[checkInDate.getMonth()];

  const checkOutDay = checkOutDate.getDate();
  const checkOutMonth =
    language === "th"
      ? SHORT_MONTHS_TH[checkOutDate.getMonth()]
      : SHORT_MONTHS_EN[checkOutDate.getMonth()];

  return `${checkInDay} ${checkInMonth} – ${checkOutDay} ${checkOutMonth}`;
}

export function formatMonthYearLabel(
  monthIndex: number,
  fullYear: number,
  language: LanguageCode
): string {
  return language === "th"
    ? `${MONTH_NAMES_TH[monthIndex]} ${fullYear + 543}`
    : `${MONTH_NAMES_EN[monthIndex]} ${fullYear}`;
}
