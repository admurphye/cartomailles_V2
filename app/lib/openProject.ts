export function openProject(
  callback: (data: unknown | null) => void
) {

  const input =
    document.createElement("input");

  input.type = "file";

  input.accept = ".cartomailles,.json";

  input.onchange = (event) => {

    const file =
      (event.target as HTMLInputElement)
        .files?.[0];

    if (!file) return;

    const reader =
      new FileReader();

    reader.onload = () => {
      try {
        callback(
          JSON.parse(reader.result as string)
        );
      } catch {
        callback(null);
      }
    };

    reader.onerror = () => callback(null);

    reader.readAsText(file);
  };

  input.click();
}
