"use client";

import { LineChart, Line, ResponsiveContainer } from "recharts";

export default function Sparkline({
  data,
  color,
}: {
  data: number[];
  color: string;
}) {
  const chartData = data.map((value, i) => ({ i, value }));
  return (
    <div className="h-10 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
