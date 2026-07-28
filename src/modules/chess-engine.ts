export type Board = string[][];

export function replayPGN(pgn: string): Board {
    let board: Board = [
        ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
        ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
        ['', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', ''],
        ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
        ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R']
    ];
    let turn: 'w' | 'b' = 'w';
    let castling = { wK: true, wQ: true, bK: true, bQ: true };
    let ep: { r: number, c: number } | null = null;

    let movetext = pgn.replace(/\[.*?\]/g, '')
                      .replace(/\{.*?\}/g, '')
                      .replace(/;.*$/gm, '')
                      .replace(/\s+/g, ' ')
                      .trim();
    
    const tokens = movetext.split(' ').filter(t => t !== '' && !/^\d+\.+$/.test(t) && !/^\d+\.\.\.$/.test(t) && !/^\d+\.$/.test(t) && t !== '*');
    const moves = tokens.map(t => t.replace(/^\d+\.+/, '')).filter(t => t !== '' && t !== '1-0' && t !== '0-1' && t !== '1/2-1/2');

    function isWhite(p: string) { return p >= 'A' && p <= 'Z'; }
    function isBlack(p: string) { return p >= 'a' && p <= 'z'; }
    function sameColor(p1: string, p2: string) {
        if (!p1 || !p2) return false;
        return (isWhite(p1) && isWhite(p2)) || (isBlack(p1) && isBlack(p2));
    }

    function cloneBoard(b: Board): Board {
        return b.map(row => [...row]);
    }

    function findKing(b: Board, color: 'w' | 'b') {
        const k = color === 'w' ? 'K' : 'k';
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                if (b[r][c] === k) return { r, c };
            }
        }
        return null;
    }

    function isAttacked(r: number, c: number, byColor: 'w' | 'b', b: Board): boolean {
        if (byColor === 'w') {
            if (r + 1 < 8) {
                if (c - 1 >= 0 && b[r + 1][c - 1] === 'P') return true;
                if (c + 1 < 8 && b[r + 1][c + 1] === 'P') return true;
            }
        } else {
            if (r - 1 >= 0) {
                if (c - 1 >= 0 && b[r - 1][c - 1] === 'p') return true;
                if (c + 1 < 8 && b[r - 1][c + 1] === 'p') return true;
            }
        }
        const kn = [ [-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1] ];
        const N = byColor === 'w' ? 'N' : 'n';
        for (let d of kn) {
            const nr = r + d[0], nc = c + d[1];
            if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && b[nr][nc] === N) return true;
        }
        const dirs = [
            { d: [[-1, 0], [1, 0], [0, -1], [0, 1]], p: byColor === 'w' ? ['R', 'Q'] : ['r', 'q'] },
            { d: [[-1, -1], [-1, 1], [1, -1], [1, 1]], p: byColor === 'w' ? ['B', 'Q'] : ['b', 'q'] }
        ];
        for (let type of dirs) {
            for (let d of type.d) {
                let nr = r + d[0], nc = c + d[1];
                while (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
                    if (b[nr][nc] !== '') {
                        if (type.p.includes(b[nr][nc])) return true;
                        break;
                    }
                    nr += d[0]; nc += d[1];
                }
            }
        }
        const K = byColor === 'w' ? 'K' : 'k';
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0) continue;
                const nr = r + dr, nc = c + dc;
                if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && b[nr][nc] === K) return true;
            }
        }
        return false;
    }

    function inCheck(color: 'w' | 'b', b: Board) {
        const king = findKing(b, color);
        if (!king) return true;
        return isAttacked(king.r, king.c, color === 'w' ? 'b' : 'w', b);
    }

    function getPseudoLegalMoves(r: number, c: number, b: Board): {r: number, c: number}[] {
        const p = b[r][c];
        if (!p) return [];
        const color = isWhite(p) ? 'w' : 'b';
        const mvs: {r: number, c: number}[] = [];
        const add = (nr: number, nc: number) => {
            if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
                if (!sameColor(p, b[nr][nc])) {
                    mvs.push({r: nr, c: nc});
                    return b[nr][nc] === '';
                }
            }
            return false;
        };

        const lp = p.toLowerCase();
        if (lp === 'p') {
            const dir = color === 'w' ? -1 : 1;
            const startRank = color === 'w' ? 6 : 1;
            if (b[r + dir][c] === '') {
                mvs.push({r: r + dir, c});
                if (r === startRank && b[r + 2 * dir][c] === '') {
                    mvs.push({r: r + 2 * dir, c});
                }
            }
            for (let dc of [-1, 1]) {
                const nc = c + dc;
                if (nc >= 0 && nc < 8) {
                    if (b[r + dir][nc] !== '' && !sameColor(p, b[r + dir][nc])) {
                        mvs.push({r: r + dir, c: nc});
                    } else if (ep && ep.r === r + dir && ep.c === nc) {
                        mvs.push({r: r + dir, c: nc});
                    }
                }
            }
        } else if (lp === 'n') {
            const kn = [ [-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1] ];
            for (let d of kn) add(r + d[0], c + d[1]);
        } else if (lp === 'k') {
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    if (dr !== 0 || dc !== 0) add(r + dr, c + dc);
                }
            }
        } else {
            const dirs = [];
            if (lp === 'r' || lp === 'q') dirs.push([-1, 0], [1, 0], [0, -1], [0, 1]);
            if (lp === 'b' || lp === 'q') dirs.push([-1, -1], [-1, 1], [1, -1], [1, 1]);
            for (let d of dirs) {
                let nr = r + d[0], nc = c + d[1];
                while (add(nr, nc)) {
                    nr += d[0]; nc += d[1];
                }
            }
        }
        return mvs;
    }

    for (let rawMove of moves) {
        if (['1-0', '0-1', '1/2-1/2', '*'].includes(rawMove)) break;
        let m = rawMove.replace(/[+#!\?]/g, '');
        
        let nextEp: {r: number, c: number} | null = null;
        let isWhiteTurn = turn === 'w';

        if (m === 'O-O' || m === 'O-O-O') {
            const r = isWhiteTurn ? 7 : 0;
            if (m === 'O-O') {
                board[r][4] = ''; board[r][5] = isWhiteTurn ? 'R' : 'r'; board[r][6] = isWhiteTurn ? 'K' : 'k'; board[r][7] = '';
            } else {
                board[r][4] = ''; board[r][3] = isWhiteTurn ? 'R' : 'r'; board[r][2] = isWhiteTurn ? 'K' : 'k'; board[r][0] = '';
            }
            if (isWhiteTurn) { castling.wK = false; castling.wQ = false; }
            else { castling.bK = false; castling.bQ = false; }
        } else {
            let piece = m[0];
            let isPawn = false;
            if (piece >= 'a' && piece <= 'h') {
                isPawn = true;
                piece = isWhiteTurn ? 'P' : 'p';
            } else {
                m = m.substring(1);
                piece = isWhiteTurn ? piece.toUpperCase() : piece.toLowerCase();
            }

            let prom = '';
            if (m.includes('=')) {
                let parts = m.split('=');
                m = parts[0];
                prom = isWhiteTurn ? parts[1].toUpperCase() : parts[1].toLowerCase();
            } else if (isPawn && (m[m.length-1] >= 'A' && m[m.length-1] <= 'Z')) {
                prom = isWhiteTurn ? m[m.length-1] : m[m.length-1].toLowerCase();
                m = m.substring(0, m.length - 1);
            }

            m = m.replace('x', '');
            const targetCol = m.charCodeAt(m.length - 2) - 97;
            const targetRow = 8 - parseInt(m[m.length - 1]);
            const disambig = m.substring(0, m.length - 2);

            let candidates: {r: number, c: number}[] = [];
            for (let r = 0; r < 8; r++) {
                for (let c = 0; c < 8; c++) {
                    if (board[r][c] === piece) {
                        const pMoves = getPseudoLegalMoves(r, c, board);
                        if (pMoves.some(mv => mv.r === targetRow && mv.c === targetCol)) {
                            let temp = cloneBoard(board);
                            temp[targetRow][targetCol] = piece;
                            temp[r][c] = '';
                            if (!inCheck(turn, temp)) {
                                candidates.push({r, c});
                            }
                        }
                    }
                }
            }

            if (disambig.length > 0) {
                if (disambig.length === 1) {
                    if (disambig[0] >= 'a' && disambig[0] <= 'h') {
                        candidates = candidates.filter(c => c.c === disambig.charCodeAt(0) - 97);
                    } else {
                        candidates = candidates.filter(c => c.r === 8 - parseInt(disambig[0]));
                    }
                } else if (disambig.length === 2) {
                    candidates = candidates.filter(c => c.c === disambig.charCodeAt(0) - 97 && c.r === 8 - parseInt(disambig[1]));
                }
            }

            if (candidates.length === 0) break;
            
            const from = candidates[0];
            const capturedPiece = board[targetRow][targetCol];
            
            board[targetRow][targetCol] = prom ? prom : piece;
            board[from.r][from.c] = '';

            if (isPawn && targetCol !== from.c && capturedPiece === '') {
                board[from.r][targetCol] = '';
            }

            if (isPawn && Math.abs(from.r - targetRow) === 2) {
                nextEp = { r: (from.r + targetRow) / 2, c: from.c };
            }

            if (piece === 'K') { castling.wK = false; castling.wQ = false; }
            if (piece === 'k') { castling.bK = false; castling.bQ = false; }
            if (piece === 'R' && from.r === 7 && from.c === 0) castling.wQ = false;
            if (piece === 'R' && from.r === 7 && from.c === 7) castling.wK = false;
            if (piece === 'r' && from.r === 0 && from.c === 0) castling.bQ = false;
            if (piece === 'r' && from.r === 0 && from.c === 7) castling.bK = false;
            if (targetRow === 0 && targetCol === 0) castling.bQ = false;
            if (targetRow === 0 && targetCol === 7) castling.bK = false;
            if (targetRow === 7 && targetCol === 0) castling.wQ = false;
            if (targetRow === 7 && targetCol === 7) castling.wK = false;
        }

        ep = nextEp;
        turn = turn === 'w' ? 'b' : 'w';
    }

    return board;
}
