import { useState } from 'react'
import CloudComparisonHub from '../components/CloudComparisonHub.jsx'
import AddInventoryModal from '../components/AddInventoryModal.jsx'
import { Plus, Cloud, Layers, CheckCircle2 } from 'lucide-react'

export default function Upload() {
  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <div className="px-8 py-8 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-red-50 text-qred border border-red-200">
              MULTI-CLOUD INGESTION
            </span>
            <span className="text-xs text-slate-500 font-mono">AWS &amp; AZURE INVENTORY HUB</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 font-display">Cloud Inventory &amp; Correlation Hub</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Ingest and correlate AWS Accounts &amp; Azure Subscriptions with Qualys VMDR vulnerability scans.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-qred text-white hover:bg-qred-hover shadow-red-pill transition-all self-start sm:self-auto"
        >
          <Plus size={14} strokeWidth={2.5} />
          Add Cloud Inventory
        </button>
      </div>

      <CloudComparisonHub
        onAddInventory={() => setIsModalOpen(true)}
      />

      <AddInventoryModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  )
}
