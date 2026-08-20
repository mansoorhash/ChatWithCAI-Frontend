import { apiPostJSON } from "../basefetch/postjson"
import { apiGetJSON } from "../basefetch/getjson"

export async function fetchModelSelections(signal, accessToken, updateAccessToken) {
    return apiGetJSON(
        '/data/selection/user',
        { signal },
        accessToken,
        updateAccessToken
    );
}

export async function saveModelSelections(changed, signal, accessToken, updateAccessToken) {
  return apiPostJSON(
        '/data/selection/user',
        { selections: changed },
        { signal },
        accessToken,
        updateAccessToken
    );
}