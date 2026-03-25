import { useState } from 'react';
import { useAsyncData } from '../hooks/useAsyncData';
import { listAdminPayments, refundAdminPayment, type AdminPayment } from '../services/adminService';
import { EmptyState, ErrorState, LoadingState } from '../components/ui/DataState';

/** Tela de pagamentos com filtros reais do endpoint administrativo. */
export function PaymentsPage() {
  const [status, setStatus] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [busyPaymentId, setBusyPaymentId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<AdminPayment | null>(null);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');

  const { data, loading, error, reload } = useAsyncData(
    () =>
      listAdminPayments({
        page: 1,
        limit: 50,
        sortOrder: 'desc',
        status: status ? [status] : undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      }),
    [status, startDate, endDate]
  );

  async function handleRefund(paymentId: string, maxAmount: number) {
    const amount = Number(refundAmount);
    const reason = refundReason.trim();
    if (Number.isNaN(amount) || amount <= 0) {
      setActionMessage('Informe um valor de reembolso válido.');
      return;
    }
    if (maxAmount > 0 && amount > maxAmount) {
      setActionMessage('Valor de reembolso não pode ser maior que o pagamento.');
      return;
    }
    if (reason.length < 5) {
      setActionMessage('Motivo do reembolso deve ter pelo menos 5 caracteres.');
      return;
    }

    setBusyPaymentId(paymentId);
    setActionMessage(null);
    try {
      await refundAdminPayment(paymentId, amount, reason);
      setActionMessage('Reembolso processado com sucesso.');
      setRefundAmount('');
      setRefundReason('');
      await reload();
    } catch (refundError) {
      setActionMessage(refundError instanceof Error ? refundError.message : 'Falha ao processar reembolso.');
    } finally {
      setBusyPaymentId(null);
    }
  }

  return (
    <section className="card">
      <header>
        <h3>Pagamentos</h3>
        <span className="muted">Consulta via /api/admin/payments</span>
      </header>

      <div className="filters-row filters-grid">
        <input placeholder="Status do pagamento" value={status} onChange={(event) => setStatus(event.target.value)} />
        <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
        <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
        <button className="ghost" onClick={reload}>Aplicar</button>
      </div>
      {actionMessage ? <span className="muted">{actionMessage}</span> : null}

      {loading ? <LoadingState /> : null}
      {error ? <ErrorState message={error} onRetry={reload} /> : null}
      {!loading && !error && data && data.data.length === 0 ? (
        <EmptyState label="Nenhum pagamento retornado pelo backend." />
      ) : null}

      {!loading && !error && data && data.data.length > 0 ? (
        <div className="split-grid">
          <div className="table">
            <div className="table-row head table-row-payments">
              <span>ID</span>
              <span>Status</span>
              <span>Metodo</span>
              <span>Valor</span>
              <span>Criado em</span>
              <span>Ações</span>
            </div>
            {data.data.map((payment) => (
              <div className="table-row table-row-payments" key={payment.id}>
                <span>{payment.id}</span>
                <span className="pill">{payment.status ?? '-'}</span>
                <span>{payment.method ?? '-'}</span>
                <span>R$ {Number(payment.amount ?? 0).toFixed(2)}</span>
                <span>{payment.createdAt ? new Date(payment.createdAt).toLocaleString() : '-'}</span>
                <span className="actions">
                  <button
                    className="ghost"
                    onClick={() => {
                      setSelectedPayment(payment);
                      setRefundAmount(`${Number(payment.amount ?? 0)}`);
                      setRefundReason('');
                    }}
                  >
                    Detalhes
                  </button>
                </span>
              </div>
            ))}
          </div>

          <aside className="card detail-card">
            <header>
              <h3>Reembolso de pagamento</h3>
              <span className="muted">POST /api/admin/payments/:paymentId/refund</span>
            </header>
            {!selectedPayment ? (
              <EmptyState label="Selecione um pagamento para processar reembolso." />
            ) : (
              <>
                <span className="muted">Pagamento: {selectedPayment.id}</span>
                <span className="muted">Valor máximo: R$ {Number(selectedPayment.amount ?? 0).toFixed(2)}</span>
                <label>
                  Valor do reembolso
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={refundAmount}
                    onChange={(event) => setRefundAmount(event.target.value)}
                  />
                </label>
                <label>
                  Motivo
                  <input
                    value={refundReason}
                    onChange={(event) => setRefundReason(event.target.value)}
                  />
                </label>
                <div className="actions">
                  <button
                    className="primary"
                    disabled={busyPaymentId === selectedPayment.id}
                    onClick={() => handleRefund(selectedPayment.id, Number(selectedPayment.amount ?? 0))}
                  >
                    {busyPaymentId === selectedPayment.id ? 'Processando...' : 'Confirmar reembolso'}
                  </button>
                </div>
              </>
            )}
          </aside>
        </div>
      ) : null}
    </section>
  );
}
