const ORDER_ERROR = 'Не удалось отправить заявку. Попробуйте ещё раз.'

export async function submitOrder(values, fetchImpl = fetch) {
  let response
  try {
    response = await fetchImpl('/api/order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    })
  } catch {
    throw new Error(ORDER_ERROR)
  }

  if (!response.ok) {
    throw new Error(ORDER_ERROR)
  }

  let result
  try {
    result = await response.json()
  } catch {
    throw new Error(ORDER_ERROR)
  }

  if (result?.ok !== true) {
    throw new Error(ORDER_ERROR)
  }

  return result
}
