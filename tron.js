export default async function Tron() {
  `
    <audio style="display: none;" controls="controls">
        <source src="https://open.spotify.com/track/5X4ojuZG2mZ68EcLyBQ1D3?si=63b6a0855ae7437b" type="audio/mpeg" />
    </audio>
  `

  const cliendID = 'e0ce7c5a25654079a4352b6bcfc14425';
  const clientSecret = 'fa10f88e258443a98fd5b038be182343';

  const redirectURI = 'http://localhost:3000';
  const { access_token } = await fetch('https://accounts.spotify.com/authorize', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    }
  });
  // play a spotify song
  const audio = new Audio('https://open.spotify.com/track/7hqlHZIXhwAzpWQxm9KzBd?si=bcf086b7d8d649cc');

  document.body.appendChild(document.createElement('button'));

  audio.addEventListener("oncanplaythrough", () => {
    audio.play();
  });
}