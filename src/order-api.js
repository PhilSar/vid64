const ORDER_ERROR = 'Не удалось отправить заявку. Попробуйте ещё раз.'
const ORDER_DELIVERY_DELAYED = 'Заявка сохранена, но уведомление менеджеру задерживается.'

export function getOrderStatusMessage(result) {
  if (result?.telegram_delivered === false) {
    return ORDER_DELIVERY_DELAYED
  }

  return result?.telegram_delivered === true
    ? 'Спасибо, заявка принята!'
    : ORDER_ERROR
}

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

  const isDeliveredResponse =
    response.status === 200 && result?.telegram_delivered === true
  const isDelayedResponse =
    response.status === 202 &&
    result?.telegram_delivered === false &&
    result.message === ORDER_DELIVERY_DELAYED

  if (result?.ok !== true || (!isDeliveredResponse && !isDelayedResponse)) {
    throw new Error(ORDER_ERROR)
  }

  return result
}
