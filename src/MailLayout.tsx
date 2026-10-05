import MailList from './MailList'
import MailView from './MailView'

/** Two-pane layout: message list on the left, selected message on the right. */
export default function MailLayout() {
  return (
    <div className="mail-layout">
      <MailList />
      <MailView />
    </div>
  )
}
