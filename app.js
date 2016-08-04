//extension
// Js 判断后缀 
String.prototype.endsWith = function(suffix) {
    return this.indexOf(suffix,this.length - suffix.length)!==-1;
};

// Js 判断前缀
if (typeof String.prototype.startsWith != 'function') {
    // see below for better implementation!
    String.prototype.startsWith = function (str){
        return this.indexOf(str) == 0;
    };
}




var superagent = require('superagent');
var cheerio = require('cheerio');
var request = require('request');
var fs= require('fs');
var path = require('path');
var header = {
    'Host': 'data.300hero.net',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': 1,
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.106 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Encoding': 'gzip, deflate, sdch',
    'Accept-Language': 'zh-CN,zh;q=0.8'
}
var url  = 'http://data.300hero.net/index.php?/web/heroes'
var equipment_url  = 'http://data.300hero.net/index.php?/web/item'
function loadHeroList(callback) {
    superagent.get(url)
        .end(function (err, sres) {
            // 常规的错误处理
            if (err) {
                return next(err);
            }
            // sres.text 里面存储着网页的 html 内容，将它传给 cheerio.load 之后
            // 就可以得到一个实现了 jquery 接口的变量，我们习惯性地将它命名为 `$`
            // 剩下就都是 jquery 的内容了
            var $ = cheerio.load(sres.text);
            var items = [];

            $('div .heroes-all .heroes-li').each(function (idx, element) {
                var $element = $(element);
                var name = $element.find('div.heroes-name a').text();
                var face = $element.find('div.heroes-face img');
                downLoadImage(face.attr('src'),$element.attr('id') + name)
                //var subPage = $element.find('div.heroes-name')
                items.push({
                    name: name,
                    face: face.attr('src'),
                    subPage: $element.find('div.heroes-name a').attr('href'),
                    locate: $element.attr('locate'),
                    attype: $element.attr('attype'),
                    id: $element.attr('id')
                });
            });
            //console.log(items);
            callback(items)
        });
}

function loadDetailInfo(url,callback) {
    superagent.get(url)
        .end(function (err, sres) {
            // 常规的错误处理
            if (err) {
                console.dir(err)
                return
                //return next(err);
            }
            //基本信息
            var $ = cheerio.load(sres.text);
            //英雄对象
            var hero = {};

            var name = $('div .page-h1 :header').text();
            var attype = $('div .page-h1 .heroes-attype').text();
            var locate = $('div .page-h1 .heroes-locate').text();
            var highImage = $('div .page-hero .hero-img').find('img').attr('src');

            hero.name = name;
            hero['attype'] = attype;
            hero.locate = locate;
            hero.highImage = highImage;
            downLoadImage(highImage,name+'BigImage')
            //英雄基础属性
            var hero_pro = [];
            $('body > div.page-box > div.page-hero > div.hero-pro').find(' > div').each(function(idx,element){
                var $element = $(element);
                var attr_name = $element.find('a').text()
                if (attr_name == '金币价格钻石价格'){
                    var price = [];
                    $element.find('> div').each(function (idx,element) {
                        var $price = $(element);
                        var name = $price.find('a').text()
                        var value =  $price.find('span').text()
                        if(name != ''){
                            hero_pro.push({
                                name:name,
                                value:value
                            })
                        }
                    })
                }else{
                    var attr_value = $element.find('div.pro-box .pro-val').text()
                    hero_pro.push({
                        name:attr_name,
                        value:attr_value
                    })
                }
            })

            hero.hero_pro = hero_pro;
            //属性信息
            var hero_info = [];
            $('body > div.page-box > div.page-hero > .hero-info > .top').find('li').each(function (idx, element) {
                var $element = $(element);
                var name = $element.find('span').text();
                var value = $element.find('a').text();
                hero_info.push({
                    name:name,
                    value:value
                })
            })
            hero.hero_info = hero_info
            //英雄背景
            var story = $('body > div.page-box > div.page-hero > .hero-info > .bottom').find('p').text();
            hero.story = story
            //技能信息
            var hero_skill = [];
            $('body > div.page-box > div.page-hero > div.hero-skill > div.hero-skill-height > div.hero-skill-list').each(function (idx, element) {
                var $element = $(element);
                var img = $element.find('img').attr('src');


                var skill_name = $element.find('div.name').attr('title');
                var skill_attr = []
                var keys = $element.find('a')
                var values = $element.find('span')
                for (i=0;i<keys.length;i++){
                    name = keys[i]
                    skill_attr.push({
                        name:$(keys[i]).text(),
                        value:$(values[i]).text()
                    })
                }

                var skill_info = $element.find('div.hero-skill-info').find('p').text();
                hero_skill.push({
                    skill_name:skill_name,
                    img:img,
                    skill_attr:skill_attr,
                    skill_info:skill_info
                })
            })

            hero.hero_skill = hero_skill
            //console.log(hero)
            callback(hero)
        })
}
function downLoadImage(url,name) {
    var fileURI = url.startsWith('http') ? url : 'http://data.300hero.net' + url;
    downloadImg(fileURI,'/Users/wz/Desktop/images/',name,function () {
        console.dir(name + '下载完成')
    })
}
function parseUrlForFileName(address) {
    var filename = path.basename(address);
    return filename;
}

var downloadImg = function(uri, path, filename, callback){
    request.head(uri, function(err, res, body){
        // console.log('content-type:', res.headers['content-type']);  //这里返回图片的类型
        // console.log('content-length:', res.headers['content-length']);  //图片大小
        if (err) {
            console.log('err: '+ err);
            downloadImg(uri, path, filename ,callback);
            return false;
        }
        fixname = parseUrlForFileName(uri).split('.').pop()//[1] //不知道有木有last
        request(uri).pipe(fs.createWriteStream(path + filename + '.' + fixname)).on('close', callback);  //调用request的管道来下载到 images文件夹下
    });
};

function write_to_file_in_JSON(items,filename) {
    console.log('完成'+items.length +'个抓取')
    var fs= require('fs');
    var dirname = '/Users/wz/Desktop/'+filename+'.txt';
    var path = require('path');
    fs.writeFile(dirname, JSON.stringify(items));
}
//
// function loadHeroList(callback) {
//     superagent.get(url)
//         .end(function (err, sres) {
//             // 常规的错误处理
//             if (err) {
//                 return next(err);
//             }
//             // sres.text 里面存储着网页的 html 内容，将它传给 cheerio.load 之后
//             // 就可以得到一个实现了 jquery 接口的变量，我们习惯性地将它命名为 `$`
//             // 剩下就都是 jquery 的内容了
//             var $ = cheerio.load(sres.text);
//             var items = [];
//
//             $('div .heroes-all .heroes-li').each(function (idx, element) {
//                 var $element = $(element);
//                 var name = $element.find('div.heroes-name a').text();
//                 var face = $element.find('div.heroes-face img');
//                 downLoadImage(face.attr('src'),$element.attr('id') + name)
//                 //var subPage = $element.find('div.heroes-name')
//                 items.push({
//                     name: name,
//                     face: face.attr('src'),
//                     subPage: $element.find('div.heroes-name a').attr('href'),
//                     locate: $element.attr('locate'),
//                     attype: $element.attr('attype'),
//                     id: $element.attr('id')
//                 });
//             });
//             //console.log(items);
//             callback(items)
//         });
// }

function loadEquipmentList(callback) {
    superagent.get(equipment_url)
        .end(function (err, sres) {
            // 常规的错误处理
            if (err) {
                return next(err);
            }
            // sres.text 里面存储着网页的 html 内容，将它传给 cheerio.load 之后
            // 就可以得到一个实现了 jquery 接口的变量，我们习惯性地将它命名为 `$`
            // 剩下就都是 jquery 的内容了
            var $ = cheerio.load(sres.text);
            var items = [];

            $('body > div.page-box > div.heroes-all').find('li').each(function (idx, element) {
                var $element = $(element);
                var name = $element.find('div.heroes-name > a').text();
                var id = $element.attr('id')//.text();
                var keywords = []
                keywords = ($element.attr('keywords').replace('，/g',',').split(','))
                var image = $element.find('div.heroes-face > a > img').attr('src')
                var subPage = $element.find('div.heroes-face > a').attr('href');
                items.push({
                    name: name,
                    id: id,
                    keywords: keywords,
                    image: image,
                    subPage: subPage
                });
            });
            console.log(items);
            callback(items)
        });
}
function loadEquipmentInfo(url,item,callback) {
    superagent.get(url)
        .end(function (err, sres) {
            // 常规的错误处理
            if (err) {
                return next(err);
            }
            // sres.text 里面存储着网页的 html 内容，将它传给 cheerio.load 之后
            // 就可以得到一个实现了 jquery 接口的变量，我们习惯性地将它命名为 `$`
            // 剩下就都是 jquery 的内容了
            var $ = cheerio.load(sres.text);
            var $element = $('body > div.page-box');
            var combineprice = $element.find('div.page-item > div.price > div:nth-child(1) > span').text();
            var fullPrice = $element.find('div.page-item > div.price > div:nth-child(2) > span').text();
            var info = $element.find('div.page-item > div.info > p').text();
            var pro = []
            $('body > div.page-box > div.page-item > div.pro').find('li').each(function (idx,element) {
                var $element = $(element);
                var data = $element.text()
                if (data !== ''){
                    pro.push(data)
                }
            })
            var combineItem = []
            $('body > div.page-box > div.page-item > div:nth-child(7)').find('li').each(function (idx,element) {
                var $element = $(element);
                var data = $(element).find('a > span').text()
                combineItem.push(data)
            })
            var subItem = []
            $('body > div.page-box > div.page-item > div:nth-child(6)').find('li').each(function (idx,element) {
                var $element = $(element);
                var data = $(element).find('a > span').text()
                subItem.push(data)
            })
            item.combineprice = combineprice
            item.fullPrice = fullPrice
            item.info = info
            item.pro = pro
            item.combineItem = combineItem
            item.subItem = subItem
            //return item
            callback(item)
        });
}

loadEquipmentList(function (items) {
    var res = []
    items.forEach(function (item,idx) {
        loadEquipmentInfo('http://data.300hero.net' + item.subPage,item,function (item) {
            res.push(item)
            if (res.length === items.length){
                console.log('完成'+res.length +'个抓取')
                var fs= require('fs');
                var dirname = '/Users/wz/Desktop/equipment.txt';
                var path = require('path');
                fs.writeFile(dirname, JSON.stringify(res));
            }
        })
    })
})

loadHeroList(function (items) {
    var count = 0
    items.forEach(function (hero,idx) {
        loadDetailInfo('http://data.300hero.net' + hero.subPage,function (detail) {
            hero.detail = detail
            count ++;
            if (count === items.length){
                write_to_file_in_JSON(items,'hero')
            }
        })
    })
});
