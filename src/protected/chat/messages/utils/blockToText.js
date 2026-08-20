export default function blocksToText(blocks = []) {
    return blocks
        .map((block) => {
        switch (block.type) {
            case "h1":
            return `# ${block.text}`;

            case "h2":
            return `## ${block.text}`;

            case "h3":
            return `### ${block.text}`;

            case "p":
            return block.text;

            case "bullets":
            return block.items
                .map((item) => `- ${typeof item === "string" ? item : item.text}`)
                .join("\n");

            case "numbered":
            return block.items
                .map((item, index) => {
                const text = typeof item === "string" ? item : item.text;
                return `${index + 1}. ${text}`;
                })
                .join("\n");

            case "code":
            return block.text;

            default:
            return block.text || "";
        }
        })
        .filter(Boolean)
        .join("\n\n");
}