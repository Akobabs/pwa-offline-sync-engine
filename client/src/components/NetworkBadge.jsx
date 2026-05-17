export default function NetworkBadge({ isOnline }) {
  return (
    <div className={`network-badge ${isOnline ? 'online' : 'offline'}`}>
      <span className="badge-dot" />
      {isOnline ? 'Online' : 'Offline'}
    </div>
  )
}
