const errorWrapper = document.querySelector(
  ".date_input_error"
) as HTMLDivElement
const errorText = errorWrapper.querySelector(".error") as HTMLDivElement

export function hideSelectedDateError() {
  errorWrapper.style.display = "none"
}

export function showSelectedDateError() {
  errorWrapper.style.display = "block"
}

export function createSelectedDateError(message: string) {
  errorText.innerText = message
  showSelectedDateError()
}
