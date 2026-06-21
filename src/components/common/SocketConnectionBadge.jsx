/**
 * Indicador de conexión Socket.io — mismo estilo que las vistas KDS.
 */
export default function SocketConnectionBadge({ connectionStatus = 'desconectado', authError, className = '' }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {connectionStatus === 'conectado' && (
        <div className="flex items-center gap-1 px-2 py-1 bg-green-600 rounded text-white text-xs font-semibold">
          <span>●</span> Realtime
        </div>
      )}
      {connectionStatus === 'desconectado' && (
        <div className="flex items-center gap-1 px-2 py-1 bg-red-600 rounded text-white text-xs font-semibold">
          <span>●</span> Desconectado
        </div>
      )}
      {connectionStatus === 'auth_error' && (
        <div
          className="flex items-center gap-1 px-2 py-1 bg-orange-600 rounded text-white text-xs font-semibold"
          title={authError || 'Error de autenticación'}
        >
          <span>●</span> Error Auth
        </div>
      )}
    </div>
  );
}
