
const DOMAIN = 'https://task.952737.xyz';

export function request(url, options = {}) {
  return new Promise((resolve, reject) => {
    fetch(`${DOMAIN}${url}`, options).then((res) => {
      return res.json();
    }).then((res) => {
      resolve(res);
    }).catch((err) => {
      reject(err);
    });
  });
}