export async function fetchJson(url: string) {
    const request = await fetch(url);
    const data = await request.json();
    return data;
}