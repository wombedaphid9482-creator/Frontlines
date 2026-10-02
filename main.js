const { app, BrowserWindow, Menu } = require("electron");
const { autoUpdater } = require("electron-updater");
const path = require("path");
const fs = require("fs");
const os = require("os");

const smoke = process.argv.includes("--smoke-test");
const simulator = process.argv.includes("--simulator");
const arsenal = process.argv.includes("--arsenal");

if (smoke) {
  const profile = path.join(os.tmpdir(), `frontlines-smoke-${process.pid}`);
  fs.mkdirSync(profile, { recursive: true });
  app.setPath("userData", profile);
  app.setPath("sessionData", profile);
}

function createWindow(page = "index.html") {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: !smoke,
    icon: path.join(
      __dirname,
      "assets",
      "ui",
      "frontlines-icon.ico"
    ),
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  win.loadFile(path.join(__dirname, page));

  if (smoke) {
    const timeout = setTimeout(() => {
      console.error("FRONTLINES_SMOKE timeout");
      app.exit(1);
    }, 60000);

    win.webContents.once("did-finish-load", async () => {
      try {
        const result = await win.webContents.executeJavaScript(`
          (async () => {
            if (location.pathname.endsWith("deck-builder.html")) {
              const deck = FrontlinesDeckBuilder.getDeck();
              const result = FrontlinesDecks
                .forData(FrontlinesData)
                .validate(deck);

              if (!result.legal) {
                throw Error("Arsenal starter is illegal");
              }

              return {
                page: "arsenal",
                cards: Object.keys(FrontlinesData.CARDS).length,
                deckSize: deck.cards.length
              };
            }

            if (location.pathname.endsWith("simulator.html")) {
              FrontlinesSimulatorApp.start({
                mode: "matrix",
                deckPool: FrontlinesDecks.presets().map(d => d.id),
                count: 20,
                seed: 7317,
                balanceProfile: "arsenal",
                aiProfiles: ["deck", "deck"]
              });

              for (let attempt = 0; attempt < 2000; attempt++) {
                const status = FrontlinesSimulatorApp.getStatus();

                if (status.status === "completed") {
                  const report = FrontlinesSimulatorApp.getReport();

                  if (report.completed !== 20 || report.summary.errors) {
                    throw Error("Simulator smoke failed");
                  }

                  return {
                    page: "simulator",
                    completed: report.completed,
                    errors: report.summary.errors,
                    runner: status.runner
                  };
                }

                if (status.status === "error") {
                  throw Error("Simulator runner failed");
                }

                await new Promise(resolve => setTimeout(resolve, 20));
              }

              throw Error("Simulator smoke timeout");
            }

            FrontlinesApp.startMatch({
              mode: "hotseat",
              factions: ["nightwalker", "rogue"],
              seed: 7317,
              developer: true,
              bothHands: true
            });

            let decisions = 0;

            while (
              FrontlinesApp.getState().winner === null &&
              decisions < 3000
            ) {
              const state = FrontlinesApp.getState();
              const action = FrontlinesAI.chooseAction(state);

              if (!action) {
                throw Error("AI returned no action");
              }

              FrontlinesApp.dispatch(action);
              decisions++;
            }

            const final = FrontlinesApp.getState();

            if (final.winner === null) {
              throw Error("Game did not finish");
            }

            return {
              page: "game",
              winner: final.winner,
              turns: final.turn,
              decisions,
              units: final.units.length
            };
          })()
        `);

        console.log(
          "FRONTLINES_SMOKE " +
          JSON.stringify({
            version: app.getVersion(),
            ...result
          })
        );

        clearTimeout(timeout);
        app.exit(0);
      } catch (error) {
        console.error(
          "FRONTLINES_SMOKE " + error.message
        );

        clearTimeout(timeout);
        app.exit(1);
      }
    });

    win.webContents.once(
      "did-fail-load",
      (_event, code, description) => {
        console.error(
          `FRONTLINES_SMOKE load error ${code}: ${description}`
        );

        clearTimeout(timeout);
        app.exit(1);
      }
    );
  }

  return win;
}

function configureAutoUpdater() {
  if (!app.isPackaged || smoke) {
    return;
  }

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on("checking-for-update", () => {
    console.log("FRONTLINES_UPDATE checking");
  });

  autoUpdater.on("update-available", (info) => {
    console.log(
      `FRONTLINES_UPDATE available ${info.version}`
    );
  });

  autoUpdater.on("update-not-available", (info) => {
    console.log(
      `FRONTLINES_UPDATE current ${info.version}`
    );
  });

  autoUpdater.on("download-progress", (progress) => {
    console.log(
      `FRONTLINES_UPDATE downloading ${progress.percent.toFixed(1)}%`
    );
  });

  autoUpdater.on("update-downloaded", (info) => {
    console.log(
      `FRONTLINES_UPDATE downloaded ${info.version}`
    );
  });

  autoUpdater.on("error", (error) => {
    console.error(
      "FRONTLINES_UPDATE error:",
      error.message
    );
  });

  autoUpdater
    .checkForUpdatesAndNotify()
    .catch((error) => {
      console.error(
        "FRONTLINES_UPDATE check failed:",
        error.message
      );
    });
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(
    Menu.buildFromTemplate([
      {
        label: "Frontlines",
        submenu: [
          {
            label: "New game window",
            click: () => createWindow("index.html")
          },
          {
            label: "Open Arsenal",
            click: () => createWindow("deck-builder.html")
          },
          {
            label: "Open Balance Lab",
            click: () => createWindow("simulator.html")
          },
          {
            type: "separator"
          },
          {
            role: "quit"
          }
        ]
      },
      {
        label: "Window",
        submenu: [
          {
            role: "minimize"
          },
          {
            role: "close"
          }
        ]
      }
    ])
  );

  createWindow(
    simulator
      ? "simulator.html"
      : arsenal
        ? "deck-builder.html"
        : "index.html"
  );

  configureAutoUpdater();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
