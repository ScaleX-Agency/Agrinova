const ONES = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"
];
const TENS = [
  "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"
];

function convertToWordsLessThanOneThousand(n: number): string {
  if (n === 0) return "";
  let result = "";

  if (n >= 100) {
    result += ONES[Math.floor(n / 100)] + " Hundred ";
    n %= 100;
  }

  if (n >= 20) {
    result += TENS[Math.floor(n / 10)] + " ";
    n %= 10;
  }

  if (n > 0) {
    result += ONES[n] + " ";
  }

  return result.trim();
}

export function numberToWords(num: number): string {
  if (num === 0) return "Zero";

  const isNegative = num < 0;
  let n = Math.abs(num);

  const parts: string[] = [];
  const billion = Math.floor(n / 1000000000);
  if (billion > 0) {
    parts.push(convertToWordsLessThanOneThousand(billion) + " Billion");
    n %= 1000000000;
  }

  const million = Math.floor(n / 1000000);
  if (million > 0) {
    parts.push(convertToWordsLessThanOneThousand(million) + " Million");
    n %= 1000000;
  }

  const thousand = Math.floor(n / 1000);
  if (thousand > 0) {
    parts.push(convertToWordsLessThanOneThousand(thousand) + " Thousand");
    n %= 1000;
  }

  if (n > 0) {
    parts.push(convertToWordsLessThanOneThousand(n));
  }

  let result = parts.join(" ");
  if (isNegative) result = "Negative " + result;

  return result;
}
