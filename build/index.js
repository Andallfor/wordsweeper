"use strict";
// hack: since its much easier to just use a static page and bundle the ts inside, i cant really use exports/import (at least idk how)
// so instead modules are defined inside index.html and we just reference the values stored (i.e. WORDS from words.ts)
// dont question it
class Game {
    constructor(size) {
        this.grid = []; // ts doesnt have char, so each string represents a row
        this.size = size;
        for (let i = 0; i < size; i++)
            this.grid.push(" ".repeat(size));
        this.content = document.getElementById('crossword-grid');
        let gridArea = '';
        for (let i = 0; i < size; i++) { // yes
            gridArea += '"';
            for (let j = 0; j < size; j++) {
                let hash = (i * size + j);
                gridArea += "" + hash + " ";
                const inp = document.createElement('input');
                inp.id = "cell-" + i + "-" + j;
                inp.minLength = 1;
                inp.maxLength = 1;
                inp.type = "text";
                inp.pattern = "^[sS]{1}$";
                inp.required = true;
                inp.value = "";
                inp.classList.add('cell', 'empty');
                this.content.appendChild(inp);
            }
            gridArea += '"\n';
        }
        this.content.style.marginLeft = "10px";
        this.content.style.gridTemplateAreas = gridArea;
        // create solution
        let n = this.rand(1, 5);
        let p = { x: this.rand(0, this.size), y: this.rand(0, this.size) };
        let char = "";
        let blacklist = [];
        let cur = [];
        for (let i = 0; i < n; i++) {
            let dir = this.rand(0, 1) == 0 ? { x: 0, y: 1 } : { x: 1, y: 0 };
            let maxLenth = 0;
        }
    }
    possibleLength(start, dir, blacklist) {
        let c = { x: start.x, y: start.y };
        let d = { x: dir.x, y: dir.y };
        let l = 1;
        // traverse pos
        while (this.inBounds(c)) {
            c = this.add(c, d);
            if (blacklist.includes(c)) {
                // should always be a gap to any other word
                l -= 1;
                break;
            }
        }
        return l;
    }
    inBounds(p) {
        return p.x >= 0 && p.y >= 0 && p.x < this.size && p.y < this.size;
    }
    add(p1, p2) {
        return { x: p1.x + p2.x, y: p1.y + p2.y };
    }
    rand(min, max) {
        return Math.floor(Math.random() * (max - min) + min);
    }
    getRandWord(maxLength, lengthAfter, char = "", iter = 10) {
        let c = 0;
        while (true) {
            let n = this.rand(0, WORDS.length);
            if (WORDS[n].length < maxLength) {
                if (char == "")
                    return WORDS[n];
                else {
                    let ind = WORDS[n].indexOf(char);
                    if (ind == -1)
                        continue;
                    if (WORDS[n].length - ind < lengthAfter)
                        continue;
                    return WORDS[n];
                }
            }
            c++;
            if (c > iter)
                return WORDS[0];
        }
    }
}
window.addEventListener('load', function () {
    const game = new Game(12);
});
