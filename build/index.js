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
        this.markAsValid(p);
        /*
        for (let i = 0; i < n; i++) {
            let dir: Point = Math.random() < 0.5 ? {x: 0, y: 1} : {x: 1, y: 0};
            let w = this.getRandWord(this.size);

            let lineInd = this.mag(this.mul(p, dir));

            let min = Math.max(0, lineInd - w.length + 1);
            let max = Math.min(lineInd, this.size - w.length);

            let offset = this.rand(min, max);

            if (dir.x != 0) this.write({x: offset, y: p.y}, w, dir);
            else this.write({x: p.x, y: offset}, w, dir);
            
            return;
        }*/
        let out = this.wordThroughPoint(p, "", blacklist);
        this.write(out.start, out.word, out.dir);
    }
    wordThroughPoint(p, char, blacklist) {
        let dir = Math.random() < 0.5 ? { x: 0, y: 1 } : { x: 1, y: 0 };
        // figure out how far we can go in the +/- neg directions
        let pos = this.getExtent(p, dir, blacklist);
        let neg = this.getExtent(p, this.mul(dir, { x: -1, y: -1 }), blacklist);
        console.log(pos, neg);
        let w = this.getRandWord(pos + neg + 1, pos, char);
        let lineInd = this.mag(this.mul(p, dir));
        let min = lineInd - neg;
        let max = lineInd + pos - w.length;
        console.log(min, max);
        console.log(w);
        let offset = this.rand(min, max);
        if (dir.x != 0)
            return { start: { x: offset, y: p.y }, word: w, dir: dir };
        else
            return { start: { x: p.x, y: offset }, word: w, dir: dir };
    }
    getExtent(p, dir, blacklist) {
        let copy = { x: p.x, y: p.y };
        let length = 0;
        while (this.inBounds(copy)) {
            copy = this.add(copy, dir);
            if (this.hasNeighbor(copy, blacklist)) {
                length--;
                break;
            } // gap of 1 to other words
            length++;
        }
        return length;
    }
    hasNeighbor(p, blacklist, dirs = [{ x: 0, y: 1 }, { x: 0, y: -1 }, { x: 1, y: 0 }, { x: -1, y: 0 }]) {
        for (let i = 0; i < 4; i++) {
            let c = this.add(p, dirs[i]);
            if (!this.inBounds(c))
                continue;
            if (blacklist.includes(c))
                return true;
        }
        return false;
    }
    write(p, s, d) {
        for (let i = 0; i < s.length; i++) {
            this.getCell(p).value = s.charAt(i);
            p = this.add(p, d);
        }
    }
    getCell(p) {
        return document.getElementById('cell-' + p.x + '-' + p.y);
    }
    markAsValid(p) {
        this.getCell(p).classList.add('goal');
    }
    inBounds(p) {
        return p.x >= 0 && p.y >= 0 && p.x < this.size && p.y < this.size;
    }
    add(p1, p2) {
        return { x: p1.x + p2.x, y: p1.y + p2.y };
    }
    sub(p1, p2) {
        return { x: p1.x - p2.x, y: p1.y - p2.y };
    }
    mul(p1, p2) {
        return { x: p1.x * p2.x, y: p1.y * p2.y };
    }
    mag(p1) {
        return Math.sqrt(p1.x * p1.x + p1.y * p1.y);
    }
    rand(min, max) {
        return Math.floor(Math.random() * (max - min) + min);
    }
    getRandWord(maxLength, lengthAfter = 0, char = "", iter = 10) {
        let c = 0;
        while (true) {
            let n = this.rand(0, WORDS.length);
            if (WORDS[n].length < maxLength && WORDS[n].length >= 3) {
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
