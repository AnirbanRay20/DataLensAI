import React, { useEffect, useState } from 'react';
import { DollarSign, ShoppingCart, TrendingUp, Star, Activity } from 'lucide-react';
import { fetchKPIs } from '../utils/api';

const ICONS = {
  dollar: DollarSign,
  shopping: ShoppingCart,
  trend: TrendingUp,
  star: Star,
  default: Activity
};

export default function StatCards({ dbSchema }) {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!dbSchema) return;
    setLoading(true);
    fetchKPIs()
      .then(data => {
        setCards(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load KPIs', err);
        setLoading(false);
      });
  }, [dbSchema]);

  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
      {loading ? (
        // Skeleton loader
        Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="glass-card p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-slate-800/50" />
            <div className="space-y-2 flex-1">
              <div className="h-3 bg-slate-800/50 w-1/2 rounded" />
              <div className="h-5 bg-slate-800/50 w-3/4 rounded" />
            </div>
          </div>
        ))
      ) : (
        cards.map((card, idx) => {
          const Icon = ICONS[card.iconType] || ICONS.default;
          return (
            <div key={idx} className="glass-card p-4 flex items-center gap-4 animate-fadeInUp">
              <div className={`w-10 h-10 rounded-xl ${card.bg || 'bg-slate-700/50'} flex items-center justify-center flex-shrink-0`}>
                <Icon size={18} className={card.color || 'text-slate-300'} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-slate-500 mb-0.5 truncate capitalize">{card.label}</p>
                <p className="text-lg font-display font-semibold text-white truncate">
                  {card.value}
                </p>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
