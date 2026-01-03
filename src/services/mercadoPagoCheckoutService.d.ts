// Tipos para o serviço Mercado Pago
// src/services/mercadoPagoCheckoutService.d.ts

export interface PackageData {
  serviceId?: string;
  providerId?: string;
  title?: string;
  ownerName?: string;
}

export interface ReservaData {
  customerName?: string;
  customerEmail?: string;
  customerCPF?: string;
  customerPhone?: string;
}

export interface PayerData {
  email?: string;
  first_name?: string;
  last_name?: string;
  cpf?: string;
  phone?: string; // ✅ Adicionado para melhorar aprovação
}

export interface CheckoutParams {
  valor: number;
  metodoPagamento: 'pix' | 'cartao';
  packageData: PackageData;
  reservaData: ReservaData;
  cardToken?: string;
  installments?: number;
  payerData?: PayerData;
  deviceId?: any; // ✅ Device ID para melhor aprovação
  issuerId?: string; // ✅ ID do emissor do cartão
  paymentMethodId?: string; // ✅ ID do método de pagamento
}

export interface CheckoutResponse {
  success?: boolean;
  payment_id?: string;
  orderId?: string;
  status?: string;
  status_detail?: string;
  qrCode?: string;
  qrCodeBase64?: string;
  ticket_url?: string;
  expiration_date?: string;
  checkoutUrl?: string;
  error?: string;
}

export declare function iniciarPagamentoCheckout(params: CheckoutParams): Promise<CheckoutResponse>;
export declare function verificarStatusPagamento(paymentId: string): Promise<any>;
