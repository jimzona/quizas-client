export default function removeWebflowFormBehaviour() {
  const forms = document.querySelectorAll("form")

  forms.forEach((form) => {
    const parent = form.parentElement as HTMLDivElement
    parent.classList.remove("w-form")

    form.removeAttribute("id")
    form.removeAttribute("method")

    form.addEventListener("submit", (e) => {
      e.preventDefault()
    })

    const successAndFailTags = parent.querySelectorAll<HTMLDivElement>(
      ".w-form-done, .w-form-fail"
    )
    successAndFailTags.forEach((tag) => {
      tag.remove()
    })
  })
}
