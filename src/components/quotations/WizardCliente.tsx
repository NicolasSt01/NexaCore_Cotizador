"use client"

interface Client {
  id: number
  businessName: string
  rfc: string
}

interface Props {
  clientId: number | null
  onSelect: (id: number) => void
  clients: Client[]
  loading: boolean
  search: string
  onSearchChange: (v: string) => void
  onNewClient: () => void
}

export function WizardCliente({ clientId, onSelect, clients, loading, search, onSearchChange, onNewClient }: Props) {
  const selected = clients.find((c) => c.id === clientId)

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <div className="flex-1">
          <input
            placeholder="Buscar cliente por RFC o razón social..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full h-10 px-3 rounded-lg bg-ink-900 border border-line text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-signal-500/40"
          />
        </div>
        <button
          onClick={onNewClient}
          className="px-4 py-2 rounded-lg border border-dashed border-line text-text-secondary hover:text-text-primary hover:border-signal-500 transition-colors text-sm whitespace-nowrap"
        >
          + Nuevo
        </button>
      </div>

      {selected && (
        <div className="p-4 rounded-lg border border-signal-500/30 bg-signal-500/5">
          <p className="font-medium text-text-primary">{selected.businessName}</p>
          <p className="text-sm text-text-muted font-mono">{selected.rfc}</p>
        </div>
      )}

      <div className="max-h-60 overflow-y-auto space-y-1">
        {loading ? (
          <p className="text-text-muted text-sm py-4 text-center">Cargando...</p>
        ) : clients.length === 0 ? (
          <p className="text-text-muted text-sm py-4 text-center">
            {search ? "Sin resultados" : "No hay clientes registrados"}
          </p>
        ) : (
          clients.map((c) => (
            <button
              key={c.id}
              onClick={() => onSelect(c.id)}
              className={`w-full text-left p-3 rounded-lg border transition-colors ${
                clientId === c.id
                  ? "border-signal-500/30 bg-signal-500/5"
                  : "border-transparent hover:bg-ink-850"
              }`}
            >
              <p className="text-sm font-medium text-text-primary">{c.businessName}</p>
              <p className="text-xs text-text-muted font-mono">{c.rfc}</p>
            </button>
          ))
        )}
      </div>
    </div>
  )
}
