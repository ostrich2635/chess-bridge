import { Board } from './chess-engine';

export function renderMiniBoard(board: Board, flipped: boolean): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    const size = 160;
    const squareSize = size / 8;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    canvas.style.border = '1px solid #999';

    const light = '#E8D0AA';
    const dark = '#B58863';

    const pieceChars: Record<string, string> = {
        'K': '♔', 'Q': '♕', 'R': '♖', 'B': '♗', 'N': '♘', 'P': '♙',
        'k': '♚', 'q': '♛', 'r': '♜', 'b': '♝', 'n': '♞', 'p': '♟'
    };

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `${squareSize * 0.75}px Arial, sans-serif`;

    for (let displayRow = 0; displayRow < 8; displayRow++) {
        for (let displayCol = 0; displayCol < 8; displayCol++) {
            // Map display position to board array indices
            const boardRow = flipped ? (7 - displayRow) : displayRow;
            const boardCol = flipped ? (7 - displayCol) : displayCol;

            const isLight = (displayRow + displayCol) % 2 === 0;
            ctx.fillStyle = isLight ? light : dark;
            
            const x = displayCol * squareSize;
            const y = displayRow * squareSize;
            
            ctx.fillRect(x, y, squareSize, squareSize);

            const piece = board[boardRow][boardCol];
            if (piece) {
                const char = pieceChars[piece];
                if (piece >= 'A' && piece <= 'Z') {
                    // White piece: white fill with dark outline
                    ctx.fillStyle = '#FFFFFF';
                    ctx.strokeStyle = '#333333';
                    ctx.lineWidth = 0.8;
                    ctx.fillText(char, x + squareSize / 2, y + squareSize / 2);
                    ctx.strokeText(char, x + squareSize / 2, y + squareSize / 2);
                } else {
                    // Black piece: dark fill
                    ctx.fillStyle = '#1a1a1a';
                    ctx.strokeStyle = '#666666';
                    ctx.lineWidth = 0.5;
                    ctx.fillText(char, x + squareSize / 2, y + squareSize / 2);
                    ctx.strokeText(char, x + squareSize / 2, y + squareSize / 2);
                }
            }
        }
    }

    return canvas;
}
