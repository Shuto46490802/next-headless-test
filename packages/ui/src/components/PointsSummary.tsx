export interface PointsSummaryProps {
  /** Sum of points_cost × quantity over lines marked `_use_points`. */
  pointsTotal: number;
  /** Customer's points balance; null when unknown. */
  balance: number | null;
}

/**
 * Running points total for the cart. Checkout applies points all-or-nothing: if the total
 * exceeds the balance, no line is discounted, so the warning here is the customer's only
 * heads-up before they reach checkout.
 */
export function PointsSummary({ pointsTotal, balance }: PointsSummaryProps) {
  if (pointsTotal === 0) return null;
  const exceeds = balance != null && pointsTotal > balance;
  return (
    <div
      className={`flex flex-col gap-1 rounded-2xl border px-4 py-3 text-sm ${
        exceeds ? "border-amber-300 bg-amber-50 text-amber-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"
      }`}
    >
      <div className="flex items-center justify-between font-medium">
        <span>Paying with points</span>
        <span>
          {pointsTotal.toLocaleString()}
          {balance != null ? ` / ${balance.toLocaleString()} pts` : " pts"}
        </span>
      </div>
      {exceeds ? (
        <span>
          This is {(pointsTotal - balance!).toLocaleString()} points over your balance. Checkout won&apos;t apply any
          points and every line will be charged at cash price. Switch a line to cash or remove one to stay within
          your balance.
        </span>
      ) : (
        <span>Points lines are discounted to $0 at checkout. Cash lines are charged as normal.</span>
      )}
    </div>
  );
}
