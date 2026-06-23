export function openProject(
  callback: (data: any) => void
) {

  const input =
    document.createElement("input");

  input.type = "file";

  input.accept = ".json";

  input.onchange = (event) => {

    const file =
      (event.target as HTMLInputElement)
        .files?.[0];

    if (!file) return;

    const reader =
      new FileReader();

    reader.onload = () => {

      const content =
        JSON.parse(
          reader.result as string
        );

      callback(content);
    };

    reader.readAsText(file);
  };

  input.click();
}