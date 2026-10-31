export function buildTelegramMessage({ name, contact, service, details }) {
  return [
    'Новая заявка с сайта ООО «ВиД»',
    `Имя: ${name}`,
    `Контакт: ${contact}`,
    `Направление: ${service}`,
    `О заказе: ${details}`,
  ].join('\n')
}
