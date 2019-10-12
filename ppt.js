let { AirParser } = require("airppt-parser");
let { AirRenderer } = require("airppt-renderer");

let pptPath = "/home/thiago/Projetos/livepraise/file.pptx";
//TO-DO: Write test for each shape and slide number and confirm
let pptParser = new AirParser(pptPath);

waitForParsing();

async function waitForParsing() {
	let details = await pptParser.ParsePowerPoint(1);
	details.inputPath = pptPath;

	let pptRenderer = new AirRenderer(details, {
		GridSize: 12,
		OutputDirectory: "output",
		PositionType: 1,
		DoNotRenderIDs: ["test"]
	});

	//TO-DO: Assert Output Check
	let rendered = await pptRenderer.renderPage(true);
	console.log("Check Output");
}