import { Link } from "@tanstack/react-router";
import { EmptyState } from "./ui-kit";

export function NoElection({ year, round }: { year: number; round: number }) {
  return (
    <EmptyState
      title="Dados não importados"
      description={
        year === 2026
          ? "2026 só será exibido após publicação oficial pelo TSE, importação e reconciliação dos totais."
          : `Não há resultados validados de ${year}, ${round}º turno, no banco.`
      }
      action={<Link to="/dados" className="text-sm text-primary">Ver status das importações</Link>}
    />
  );
}
