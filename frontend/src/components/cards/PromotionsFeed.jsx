import EmailPreview from '../email/EmailPreview'

function PromotionsFeed({ emails }) {
  return (
    <section className="promotions-feed" aria-label="Promotions">
      <div className="promotions-feed__header">
        <h3 className="promotions-feed__title">Promotions</h3>
        <span className="promotions-feed__count">{emails.length}</span>
      </div>
      <div className="promotions-feed__scroll">
        {emails.map((email) => (
          <EmailPreview key={email.id} email={email} variant="promo" />
        ))}
      </div>
    </section>
  )
}

export default PromotionsFeed
