import { useState } from 'react'
import { ArrowDown, ArrowRight, ArrowUpRight, Menu, X } from 'lucide-react'

const services = [
  { number: '01', title: 'Брендинг', description: 'Позиционирование, имя, айдентика и правила, которые помогают бренду быть собой.' },
  { number: '02', title: 'Цифровые продукты', description: 'Сайты и интерфейсы, в которых ясная логика встречается с характерным дизайном.' },
  { number: '03', title: 'Арт-дирекшн', description: 'Визуальная система для кампаний, контента и новых точек роста.' },
]

const projects = [
  { name: 'Тихий берег', category: 'Айдентика · 2025', color: 'project-sand', mark: 'ТБ' },
  { name: 'FORMA objects', category: 'Стратегия, брендинг · 2024', color: 'project-orange', mark: 'F.' },
  { name: 'Листья', category: 'Цифровой продукт · 2024', color: 'project-green', mark: 'лист' },
]

function App() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [formStatus, setFormStatus] = useState('')
  const botName = import.meta.env.VITE_TELEGRAM_BOT_USERNAME?.replace(/^@/, '')

  function handleSubmit(event) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const message = [
      'Новая заявка с сайта Север',
      `Имя: ${form.get('name')}`,
      `Контакт: ${form.get('contact')}`,
      `Интересует: ${form.get('service')}`,
      `О проекте: ${form.get('details') || 'пока без подробностей'}`,
    ].join('\n')

    if (!botName || botName === 'your_bot_username') {
      setFormStatus('Укажите имя бота в VITE_TELEGRAM_BOT_USERNAME в файле .env.')
      return
    }

    window.open(`https://t.me/${botName}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer')
    setFormStatus('Telegram откроется в новой вкладке. Отправьте подготовленное сообщение.')
  }

  return (
    <>
      <header className="site-header">
        <a className="wordmark" href="#top" aria-label="Север — на главную">север<span>®</span></a>
        <nav className={menuOpen ? 'main-nav is-open' : 'main-nav'} aria-label="Основная навигация">
          <a href="#studio" onClick={() => setMenuOpen(false)}>Студия</a>
          <a href="#projects" onClick={() => setMenuOpen(false)}>Проекты</a>
          <a href="#services" onClick={() => setMenuOpen(false)}>Что делаем</a>
          <a className="nav-contact" href="#contact" onClick={() => setMenuOpen(false)}>Обсудить проект <ArrowUpRight size={15} /></a>
        </nav>
        <button className="menu-toggle" aria-label={menuOpen ? 'Закрыть меню' : 'Открыть меню'} onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? <X size={21} /> : <Menu size={21} />}
        </button>
      </header>

      <main id="top">
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-copy">
            <p className="eyebrow"><span className="status-dot" /> Независимая дизайн-студия · Москва / везде</p>
            <h1 id="hero-title">Находим<br />суть. <span>Придаём</span><br />форму.</h1>
            <div className="hero-bottom">
              <p>Создаём бренды и цифровые продукты, которые помогают хорошим идеям стать заметными.</p>
              <a className="round-link" href="#projects" aria-label="Смотреть проекты"><ArrowDown size={20} /></a>
            </div>
          </div>
          <div className="hero-visual" role="img" aria-label="Светлая мастерская студии с рабочим столом и материалами">
            <div className="visual-caption"><span>думать ясно</span><span>делать смело</span></div>
            <div className="visual-stamp">С<br />/24</div>
          </div>
          <div className="hero-index"><span>01 — 04</span><span>Листайте ниже</span></div>
        </section>

        <section className="intro section-pad" id="studio">
          <p className="section-label">01 / О студии</p>
          <div className="intro-content">
            <h2>Хороший дизайн<br />начинается <em>с вопроса.</em></h2>
            <div className="intro-note">
              <p>Мы — небольшая команда стратегов и дизайнеров. Вникаем в контекст, находим главное и превращаем его в работающую визуальную систему.</p>
              <a className="text-link" href="#contact">Познакомиться <ArrowRight size={16} /></a>
            </div>
          </div>
          <div className="principles"><span>01 / любопытство</span><span>02 / ясность</span><span>03 / внимание к деталям</span></div>
        </section>

        <section className="projects section-pad" id="projects">
          <div className="section-heading">
            <p className="section-label">02 / Избранное</p>
            <p className="section-aside">Несколько историй<br />последних сезонов</p>
          </div>
          <div className="project-grid">
            {projects.map((project, index) => (
              <article className={`project ${project.color}`} key={project.name}>
                <div className="project-art" aria-label={`Визуальная композиция проекта ${project.name}`}>
                  <span className="project-index">0{index + 1}</span>
                  <span className="project-mark">{project.mark}</span>
                  <span className="project-art-caption">избранный проект<br />север / студия</span>
                </div>
                <div className="project-meta"><h3>{project.name}</h3><span>{project.category}</span><ArrowUpRight size={17} /></div>
              </article>
            ))}
          </div>
        </section>

        <section className="services section-pad" id="services">
          <div className="section-heading">
            <p className="section-label">03 / Чем помогаем</p>
            <h2>От первого вопроса<br />до <em>большого запуска.</em></h2>
          </div>
          <div className="service-list">
            {services.map((service) => (
              <article className="service-row" key={service.number}>
                <span className="service-number">{service.number}</span>
                <h3>{service.title}</h3>
                <p>{service.description}</p>
                <ArrowUpRight className="service-arrow" size={19} />
              </article>
            ))}
          </div>
        </section>

        <section className="contact section-pad" id="contact">
          <div className="contact-heading">
            <p className="section-label">04 / Начнём разговор</p>
            <h2>Есть идея?<br /><em>Мы рядом.</em></h2>
            <p className="contact-note">Расскажите пару слов о задаче — ответим в Telegram и предложим следующий шаг.</p>
            <a className="contact-email" href="mailto:hello@sever.studio">hello@sever.studio <ArrowUpRight size={16} /></a>
          </div>
          <form className="contact-form" onSubmit={handleSubmit}>
            <label>Как к вам обращаться<input name="name" placeholder="Ваше имя" autoComplete="name" required /></label>
            <label>Куда написать<input name="contact" placeholder="@telegram или телефон" required /></label>
            <label>Что вас интересует<select name="service" defaultValue="" required><option value="" disabled>Выберите направление</option><option>Брендинг</option><option>Цифровой продукт</option><option>Арт-дирекшн</option><option>Пока не знаю</option></select></label>
            <label>Пара слов о проекте<textarea name="details" placeholder="Контекст, сроки, что важно..." rows="2" /></label>
            <button className="submit-button" type="submit">Отправить заявку <ArrowRight size={18} /></button>
            {formStatus && <p className="form-privacy" role="status" aria-live="polite">{formStatus}</p>}
            <p className="form-privacy">Сообщение откроется в Telegram и отправится после вашего подтверждения.</p>
          </form>
        </section>
      </main>

      <footer className="site-footer"><a className="wordmark" href="#top">север<span>®</span></a><p>Дизайн с ясной головой<br />и живым интересом.</p><span className="copyright">© Север, 2025–2026</span><a className="footer-up" href="#top">Наверх <ArrowUpRight size={15} /></a></footer>
    </>
  )
}

export default App