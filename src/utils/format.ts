const priceINTL = new Intl.NumberFormat("fr-FR", {
  currency: "EUR",
  style: "currency",
})

export const formatPrice = (price: number) => priceINTL.format(price)

export const formatDateString = (date: Date | string) =>
  new Date(date).toLocaleDateString("fr-FR", {
    month: "long",
    day: "numeric",
    year: "numeric",
  })
