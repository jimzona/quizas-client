import { AirDatepickerOptions } from "air-datepicker"
import localeFr from "air-datepicker/locale/fr"
import { addYears } from "date-fns"

export const configBaseDatepicker: Partial<AirDatepickerOptions> = {
  range: true,
  multipleDatesSeparator: " - ",
  locale: localeFr,
  minDate: new Date(),
  maxDate: addYears(new Date(), 1),
}
