import axios from 'axios'

const currencyRates = async () => {
    const { data } = await axios.get(
        `https://api.bigpara.hurriyet.com.tr/doviz/headerlist/anasayfa`
    );
    const dolar = data.data.find(item => item.SEMBOLID === 1302).SATIS;
    const euro = data.data.find(item => item.SEMBOLID === 1639).SATIS;
    return {dolar, euro};
}

export {currencyRates};