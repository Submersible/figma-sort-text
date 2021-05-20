const ASK_IF_SELECTED_TEXT_COMPONENT_THRESHOLD = 2;

async function main() {
    const selectedTextNodes = (
        getAllChildren(figma.currentPage.selection).filter(isTextNode).filter(x => x.visible === true)
    );
    const amount = selectedTextNodes.length;

    if (amount === 0) {
        figma.notify(`Please select a text node before sorting`);
    }

    try {
        if (amount >= ASK_IF_SELECTED_TEXT_COMPONENT_THRESHOLD) {
            if (!await AskQuestionUI.confirm(amount)) {
                return;
            }
        }
        await TextNodeUtil.loadFonts(selectedTextNodes);
        for (let node of selectedTextNodes) {
            TextNodeUtil.sortLines(node);
        }
        figma.notify(`Sorted ${amount.toLocaleString()} text components!`);
        figma.viewport.scrollAndZoomIntoView(selectedTextNodes);
    } finally {
        figma.closePlugin();
    }
}

namespace TextNodeUtil {
    export type Character = {
        character: string;
        fontSize: ReturnType<TextNode["getRangeFontSize"]>;
        fontName: ReturnType<TextNode["getRangeFontName"]>;
        textCase: ReturnType<TextNode["getRangeTextCase"]>;
        textDecoration: ReturnType<TextNode["getRangeTextDecoration"]>;
        letterSpacing: ReturnType<TextNode["getRangeLetterSpacing"]>;
        lineHeight: ReturnType<TextNode["getRangeLineHeight"]>;
        fills: ReturnType<TextNode["getRangeFills"]>;
        textStyleId: ReturnType<TextNode["getRangeTextStyleId"]>;
        fillStyleId: ReturnType<TextNode["getRangeFillStyleId"]>;
    };


    export function sortLines(node: TextNode) {
        if (node.characters.length === 0) {
            return;
        }

        const characters = getCharacters(node);
        const lineBreak = Object.assign({}, characters[0], { character: "\n" });

        const sortedLines = splitOn(characters, (x) => x.character === "\n").sort((a, b) => {
            const aText = a.map(x => x.character).join("").trim();
            const bText = b.map(x => x.character).join("").trim();
            if (aText === "") {
                return 1;
            } else if (bText === "") {
                return -1;
            } else if (aText < bText) {
                return -1
            } else if (aText > bText) {
                return 1;
            } else {
                return 0;
            }
        });

        const sortedCharacters = sortedLines.reduce((a, b) => a.concat([lineBreak], b));

        setCharacters(node, sortedCharacters);
    }

    export function getCharacters(node: TextNode): Character[] {
        return [...node.characters].map((x, i) => ({
            character: x,
            fontSize: node.getRangeFontSize(i, i + 1),
            fontName: node.getRangeFontName(i, i + 1),
            textCase: node.getRangeTextCase(i, i + 1),
            textDecoration: node.getRangeTextDecoration(i, i + 1),
            letterSpacing: node.getRangeLetterSpacing(i, i + 1),
            lineHeight: node.getRangeLineHeight(i, i + 1),
            fills: node.getRangeFills(i, i + 1),
            textStyleId: node.getRangeTextStyleId(i, i + 1),
            fillStyleId: node.getRangeFillStyleId(i, i + 1),
        }));
    }

    export function setCharacters(node: TextNode, characters: Character[]) {
        const text = characters.map(x => x.character).join("");
        node.characters = text;
        characters.forEach((character, i) => {
            if (!isSymbol(character.fontSize)) {
                node.setRangeFontSize(i, i + 1, character.fontSize);
            }
            if (!isSymbol(character.fontName)) {
                node.setRangeFontName(i, i + 1, character.fontName);
            }
            if (!isSymbol(character.textCase)) {
                node.setRangeTextCase(i, i + 1, character.textCase);
            }
            if (!isSymbol(character.textDecoration)) {
                node.setRangeTextDecoration(i, i + 1, character.textDecoration);
            }
            if (!isSymbol(character.letterSpacing)) {
                node.setRangeLetterSpacing(i, i + 1, character.letterSpacing);
            }
            if (!isSymbol(character.lineHeight)) {
                node.setRangeLineHeight(i, i + 1, character.lineHeight);
            }
            if (!isSymbol(character.fills)) {
                node.setRangeFills(i, i + 1, character.fills);
            }
            if (!isSymbol(character.textStyleId)) {
                node.setRangeTextStyleId(i, i + 1, character.textStyleId);
            }
            if (!isSymbol(character.fillStyleId)) {
                node.setRangeFillStyleId(i, i + 1, character.fillStyleId);
            }
        });
    }

    export async function loadFonts(node: TextNode | TextNode[]) {
        await Promise.all(getFontNames(node).map(fontName => figma.loadFontAsync(fontName)));
    }

    export function getFontNames(node: TextNode | TextNode[]): ReadonlyArray<FontName> {
        if (Array.isArray(node)) {
            return Array.prototype.concat.apply([], node.map(x => getFontNames(x)));
        }
        return range(node).map(i => node.getRangeFontName(i, i + 1)).filter(isFontName);
    }

    export function range(node: TextNode): ReadonlyArray<number> {
        return [...node.characters].map((_, i) => i);
    }
}

namespace AskQuestionUI {
    export async function confirm(amount: number): Promise<boolean> {
        return new Promise(resolve => {
            figma.ui.onmessage = (message) => {
                if (typeof message.width === "number" && typeof message.height === "number") {
                    figma.ui.resize(message.width, message.height);
                }
                if (typeof message.confirm === "boolean") {
                    figma.ui.close();
                    resolve(message.confirm);
                }
            }
            figma.showUI(performActionHtml(amount), { width: 400, height: 170 })
        });
    }

    const performActionHtml = (amount: number) => {
        const yesMessage = (amount > 10) ? "Yes, Do It! 🤪" : "Yep!";
        const noMessage = (amount > 10) ? "Nevermind 😵" : "Nevermind";
        return `
            <script>
            const sendMessage = (value) => parent.postMessage({pluginMessage: value}, "*");
            </script>
            <style>
            * {
                font-family: Inter, sans-serif;
                font-size: 20px;
            }
            body {
                margin: 0;
            }
            p {
                margin: 0;
                padding-bottom: 20px;
                padding-left: 20px;
                padding-right: 20px;
            }
            p:first-child {
                padding-top: 20px;
            }
            button {
                cursor: hand;
                font-weight: bold;
                border: 0;
                line-height: 20px;
                padding: 12px 23px;
            }
            .yah {
                background: #6aa56c;
                color: white;
                border-radius: 100px;
            }
            .yah:hover {
                background-color: #436944;
            }
            .nah {
                background: none;
                color: #383838;
                padding-left: 18px;
            }
            .nah:hover {
                text-decoration: underline;
            }
            </style>
            <div id="cool-ui">
                <p>This will sort ${amount.toLocaleString()} text components.</p>
                <p>Are you sure you want to do that?</p>
                <p>
                    <button onclick="sendMessage({confirm: true})" class="yah">${yesMessage}</button>
                    <button onclick="sendMessage({confirm: false})" class="nah">${noMessage}</button>
                </p>
            </div>
            <script>
            const cool = document.querySelector("#cool-ui");
            sendMessage({width: cool.offsetWidth, height: cool.offsetHeight})
            </script>
        `;
    }
}

function getAllChildren(nodes: SceneNode | ReadonlyArray<SceneNode>): ReadonlyArray<SceneNode> {
    if (!Array.isArray(nodes)) {
        return getAllChildren([nodes] as ReadonlyArray<SceneNode>);
    }
    let children = [...nodes];
    nodes.forEach(node => {
        if (!nodeHasChildren(node)) {
            return;
        }
        if (typeof node["remote"] === "boolean") {
            if (node["remote"]) {
                return;
            }
        }
        node.children.forEach(child => {
            children = children.concat(getAllChildren(child))
        });
    })
    return children;
}

function splitOn<T>(list: T[], f: (value: T) => boolean): T[][] {
    let currentSplit: T[] | null = null;
    const splits: T[][] = [];
    for (let item of list) {
        if (currentSplit === null) {
            currentSplit = [];
            splits.push(currentSplit);
        }
        if (f(item)) {
            currentSplit = [];
            splits.push(currentSplit);
        } else {
            currentSplit.push(item);
        }
    }
    return splits;
}

function isTextNode(node: SceneNode): node is TextNode {
    return node.type === "TEXT";
}

function isSymbol<T>(value: T | symbol): value is symbol {
    return typeof value === "symbol";
}

function isNotSymbol<T>(value: T | symbol): value is T {
    return typeof value !== "symbol";
}

function isFontName(fontName: TextNode["fontName"]): fontName is FontName {
    return (typeof fontName["family"] === "string") && (typeof fontName["style"] === "string");
}

function nodeHasChildren(node: SceneNode): node is SceneNode & ChildrenMixin {
    return Array.isArray(node["children"]);
}

main().catch(console.error);