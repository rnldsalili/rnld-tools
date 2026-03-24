export interface LoanCalculatorShareCardData {
  calculationModeLabel: string;
  interestLabel: string;
  paymentLabel: string;
  paymentDetail: string;
  principalAmount: string;
  periodicPayment: string;
  totalRepayment: string;
  totalInterest: string;
  processingFee: string;
  expectedAmountReceived: string;
  isExpectedAmountNegative: boolean;
}

const CANVAS_WIDTH = 1200;
const CANVAS_HEIGHT = 1320;

export async function createLoanCalculatorShareFile(
  shareData: LoanCalculatorShareCardData,
): Promise<File> {
  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;

  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('Canvas is not available in this browser.');
  }

  paintBackground(context);
  paintCard(context);
  paintHeader(context, shareData);
  paintHero(context, shareData);
  paintMetrics(context, shareData);
  paintFooter(context, shareData);

  const blob = await canvasToBlob(canvas);

  return new File([blob], 'loan-calculator-result.png', { type: 'image/png' });
}

export function downloadLoanCalculatorShareFile(file: File) {
  const objectUrl = URL.createObjectURL(file);
  const anchor = document.createElement('a');

  anchor.href = objectUrl;
  anchor.download = file.name;
  anchor.click();

  setTimeout(() => URL.revokeObjectURL(objectUrl), 1_000);
}

function paintBackground(context: CanvasRenderingContext2D) {
  const gradient = context.createLinearGradient(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  gradient.addColorStop(0, '#f8fbf1');
  gradient.addColorStop(0.52, '#f2f8e8');
  gradient.addColorStop(1, '#edf7de');
  context.fillStyle = gradient;
  context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  context.fillStyle = 'rgba(114, 168, 47, 0.08)';
  context.beginPath();
  context.arc(182, 156, 174, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = 'rgba(132, 204, 22, 0.14)';
  context.beginPath();
  context.arc(1010, 250, 200, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = 'rgba(15, 35, 22, 0.04)';
  context.beginPath();
  context.arc(1060, 1140, 250, 0, Math.PI * 2);
  context.fill();
}

function paintCard(context: CanvasRenderingContext2D) {
  drawRoundedRect(context, 72, 64, CANVAS_WIDTH - 144, CANVAS_HEIGHT - 128, 38);
  context.fillStyle = '#fbfdf7';
  context.fill();

  context.strokeStyle = 'rgba(102, 145, 46, 0.14)';
  context.lineWidth = 2;
  context.stroke();
}

function paintHeader(
  context: CanvasRenderingContext2D,
  shareData: LoanCalculatorShareCardData,
) {
  context.fillStyle = '#112417';
  context.font = '700 64px "Helvetica Neue", Arial, sans-serif';
  context.fillText('Loan Calculation', 128, 164);

  context.fillStyle = '#56705c';
  context.font = '500 28px "Helvetica Neue", Arial, sans-serif';
  context.fillText(shareData.paymentDetail, 132, 212);

  drawPill(context, 826, 118, 234, 56, '#e4f4c8', '#35521a', shareData.calculationModeLabel);
  drawPill(context, 826, 190, 234, 56, '#f0f7e1', '#496131', shareData.interestLabel);
}

function paintHero(
  context: CanvasRenderingContext2D,
  shareData: LoanCalculatorShareCardData,
) {
  drawRoundedRect(context, 124, 282, CANVAS_WIDTH - 248, 246, 28);
  context.fillStyle = '#16261b';
  context.fill();

  context.fillStyle = '#c4d7a9';
  context.font = '600 24px "Helvetica Neue", Arial, sans-serif';
  context.fillText(shareData.paymentLabel.toUpperCase(), 164, 352);

  context.fillStyle = '#f7fbef';
  context.font = '700 86px "Helvetica Neue", Arial, sans-serif';
  context.fillText(shareData.periodicPayment, 160, 444);

  context.fillStyle = '#b4c79e';
  context.font = '500 28px "Helvetica Neue", Arial, sans-serif';
  context.fillText(shareData.interestLabel, 164, 494);

}

function paintMetrics(
  context: CanvasRenderingContext2D,
  shareData: LoanCalculatorShareCardData,
) {
  const metricCards = [
    { label: 'Loan Amount', value: shareData.principalAmount },
    { label: 'Total Repayment', value: shareData.totalRepayment },
    { label: 'Total Interest', value: shareData.totalInterest },
    {
      label: 'Expected Amount Received',
      value: shareData.expectedAmountReceived,
      emphasis: shareData.isExpectedAmountNegative,
    },
    { label: 'Processing Fee', value: shareData.processingFee },
  ];

  metricCards.forEach((metricCard, index) => {
    const column = index % 2;
    const row = Math.floor(index / 2);
    const cardWidth = index === metricCards.length - 1 ? CANVAS_WIDTH - 248 : 434;
    const x = index === metricCards.length - 1 ? 124 : 124 + column * 462;
    const y = 576 + row * 168;

    drawRoundedRect(context, x, y, cardWidth, 136, 24);
    context.fillStyle = metricCard.emphasis ? '#fff0ef' : '#f4f9ea';
    context.fill();

    context.strokeStyle = metricCard.emphasis ? 'rgba(180, 35, 24, 0.14)' : 'rgba(129, 171, 64, 0.18)';
    context.lineWidth = 2;
    context.stroke();

    context.fillStyle = '#60715f';
    context.font = '600 22px "Helvetica Neue", Arial, sans-serif';
    context.fillText(metricCard.label.toUpperCase(), x + 34, y + 48);

    context.fillStyle = metricCard.emphasis ? '#b42318' : '#16261b';
    context.font = '700 44px "Helvetica Neue", Arial, sans-serif';
    context.fillText(metricCard.value, x + 34, y + 98);
  });
}

function paintFooter(
  context: CanvasRenderingContext2D,
  shareData: LoanCalculatorShareCardData,
) {
  drawRoundedRect(context, 124, 1080, CANVAS_WIDTH - 248, 146, 26);
  context.fillStyle = '#eff7df';
  context.fill();

  context.strokeStyle = 'rgba(129, 171, 64, 0.16)';
  context.lineWidth = 2;
  context.stroke();

  context.fillStyle = '#2d4425';
  context.font = '600 24px "Helvetica Neue", Arial, sans-serif';
  context.fillText('Summary', 160, 1140);

  context.fillStyle = '#556857';
  context.font = '500 28px "Helvetica Neue", Arial, sans-serif';
  context.fillText(shareData.paymentDetail, 160, 1192);
}

function drawPill(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  backgroundColor: string,
  textColor: string,
  text: string,
) {
  drawRoundedRect(context, x, y, width, height, height / 2);
  context.fillStyle = backgroundColor;
  context.fill();

  context.fillStyle = textColor;
  context.font = '600 24px "Helvetica Neue", Arial, sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(text, x + width / 2, y + height / 2);
  context.textAlign = 'start';
  context.textBaseline = 'alphabetic';
}

function drawRoundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.lineTo(x + width - radius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + radius);
  context.lineTo(x + width, y + height - radius);
  context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  context.lineTo(x + radius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - radius);
  context.lineTo(x, y + radius);
  context.quadraticCurveTo(x, y, x + radius, y);
  context.closePath();
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Unable to generate result image.'));
        return;
      }

      resolve(blob);
    }, 'image/png');
  });
}
