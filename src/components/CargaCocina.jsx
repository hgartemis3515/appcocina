import { motion } from 'framer-motion';

function Hueso({ className }) {
  return <div className={`rounded-lg bg-gray-800 animate-pulse ${className}`} />;
}

export default function CargaCocina() {
  return (
    <div className="min-h-screen bg-gray-900 p-4 md:p-6" role="status" aria-label="Cargando cocina">
      <motion.p
        className="text-orange-500 text-lg font-semibold mb-4"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
      >
        Cocina
      </motion.p>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="rounded-xl border border-gray-800 bg-gray-950 p-4 space-y-3">
            <Hueso className="h-4 w-24" />
            <Hueso className="h-6 w-3/4" />
            <Hueso className="h-16 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
