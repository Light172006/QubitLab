import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface HistogramPanelProps {
  counts: Record<string, number>;
}

export function HistogramPanel({ counts }: HistogramPanelProps) {
  const data = Object.entries(counts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([state, count]) => ({ state, count }));

  const total = data.reduce((sum, d) => sum + d.count, 0);

  return (
    <div className="h-40">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" accessibilityLayer>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis type="number" tick={{ fontSize: 13, fill: '#4B5563' }} />
          <YAxis type="category" dataKey="state" tick={{ fontSize: 13, fill: '#111827', fontFamily: 'JetBrains Mono' }} width={60} />
          <Tooltip
            formatter={(value: number) => [value, `count (${((value / total) * 100).toFixed(1)}%)`]}
            contentStyle={{ backgroundColor: '#fff', border: '1px solid #E5E7EB', borderRadius: '8px' }}
          />
          <Bar dataKey="count" radius={[0, 4, 4, 0]} fill="#3F6212">
            {data.map((_, i) => <Cell key={`cell-${i}`} fill="#3F6212" />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}