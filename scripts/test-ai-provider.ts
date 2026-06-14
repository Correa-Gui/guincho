// Smoke test manual do AIProvider configurado (AI_PROVIDER, default "gemini").
//
// Uso:
//   npm run test:ai -- texto "/gasto 50 combustível"
//   npm run test:ai -- comprovante ./caminho/foto.jpg
//   npm run test:ai -- audio ./caminho/audio.ogg
//
// Requer GEMINI_API_KEY em .env.local.

import { readFileSync } from "node:fs";
import { getAIProvider } from "../lib/ai";

async function main() {
  const [modo, arg] = process.argv.slice(2);
  const provider = getAIProvider();

  switch (modo) {
    case "texto": {
      if (!arg) throw new Error("Uso: npm run test:ai -- texto \"<mensagem>\"");
      const resultado = await provider.interpretarMensagem(arg);
      console.log(JSON.stringify(resultado, null, 2));
      break;
    }
    case "comprovante": {
      if (!arg) throw new Error("Uso: npm run test:ai -- comprovante <caminho-da-imagem>");
      const imagem = readFileSync(arg);
      const mimeType = arg.endsWith(".png") ? "image/png" : "image/jpeg";
      const resultado = await provider.lerComprovante(imagem, mimeType);
      console.log(JSON.stringify(resultado, null, 2));
      break;
    }
    case "audio": {
      if (!arg) throw new Error("Uso: npm run test:ai -- audio <caminho-do-audio>");
      const audio = readFileSync(arg);
      const mimeType = arg.endsWith(".mp3") ? "audio/mpeg" : "audio/ogg";
      const resultado = await provider.transcreverAudio(audio, mimeType);
      console.log(resultado);
      break;
    }
    default:
      throw new Error('Modo inválido. Use "texto", "comprovante" ou "audio".');
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
