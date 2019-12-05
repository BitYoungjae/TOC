import {
    L,
    curry,
    pipe,
    go,
} from "./functional.mjs";

const getElementsList = curry((f, root) => go(
    Array.from(root.children),
    L.filter(f),
    L.map(({
        tagName,
        id,
        textContent
    }) => {
        return {
            tagName,
            id,
            textContent,
            subHeadings: []
        };
    })
));

const isHeading = element => element.nodeName.startsWith("H");
const getHeadingElementsList = getElementsList(isHeading);

const getNumberByHeadingTagName = (tagName) => tagName[tagName.length - 1] >> 0;
const getDepthDiff = (one, two) => getNumberByHeadingTagName(one) - getNumberByHeadingTagName(two);
const normalizeHeadingTagName = (tagName, depth) => "H" + (getNumberByHeadingTagName(tagName) + depth);

const normalizeHeadingElementList = (list) => L.map(
    (element, previous) => {
        if (!previous) return element;
        if (element.tagName === "H1") element.tagName = "H2";

        const depthDiff = getDepthDiff(previous.tagName, element.tagName);

        if (depthDiff <= -2) {
            const tagName = element.tagName;
            element.tagName = normalizeHeadingTagName(tagName, depthDiff + 1);
        }

        return element;
    }, list);

const getHeadingElementsChain = (list) => {
    const iterator = list[Symbol.iterator]();
    const parentPointer = new Map();

    let result = {
        tagName: "H1",
        textContent: "",
        subHeadings: []
    };
    let now = iterator.next();
    let previous = null;

    if (now.value.tagName === "H1") {
        result = now.value;
        previous = now.value;
    } else {
        result.subHeadings.push(now.value);
        previous = result;
    }

    while ((now = iterator.next()) && now.value) {
        const {
            tagName
        } = now.value;

        if (previous.tagName < tagName) {
            const subArray = [];
            subArray.push(now.value);

            previous.subHeadings.push(now.value);

            parentPointer.set(tagName, previous);
        } else if (previous.tagName >= tagName) {
            parentPointer.get(tagName).subHeadings.push(now.value);
        } else {
            return {};
        }

        previous = now.value;
    }

    return result;
};

const createList = now => {
    const li = document.createElement("LI");
    const anchor = document.createElement("A");

    anchor.textContent = now.textContent;
    anchor.href = `#${now.id}`;

    li.appendChild(anchor);

    return li;
}

const createNestedList = (now) => {
    const li = createList(now);

    if (now.subHeadings.length) {
        const ul = document.createElement("UL");
        li.appendChild(ul);

        now.subHeadings.forEach(
            child => {
                ul.appendChild(createNestedList(child))
            }
        );
    }

    return li;
}

const convertHeadingElementChainToListElement = (now) => {
    const ul = document.createElement("UL");

    ul.appendChild(createNestedList(now));

    return ul;
};

const createTOCObject = pipe(
    getHeadingElementsList,
    normalizeHeadingElementList,
    getHeadingElementsChain
);

const createTOC = pipe(
    createTOCObject,
    convertHeadingElementChainToListElement
);

export {
    createTOC,
    createTOCObject
};