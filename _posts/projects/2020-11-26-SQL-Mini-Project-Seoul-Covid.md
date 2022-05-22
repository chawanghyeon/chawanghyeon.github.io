---
title: 'SQL-Mini-Project-Seoul-Covid'
date: 2020-11-26
draft: false
description: 'SQL-Mini-Project-Seoul-Covid'
tags: [SQL-Mini-Project-Seoul-Covid]
categories: [projects]
---
# [SQL-Mini-Project-Seoul-Covid](https://github.com/chawanghyeon/SQL-Mini-Project-Seoul-Covid)

## 프로젝트 주제 선정
 차왕현과 김재웅 팀 왕재는 SQL프로젝트를 하나 진행하기로 했습니다. 프로젝트 주제를 선정하는 과정에서 제가 요즘 코로나 바이러스가 심각한데 코로나를 주제로 프로젝트를 진행하면 어떻겠냐고 제안했습니다. 재웅님도 평소에 코로나에 대해 관심이 많으셔서 코로나를 주제로 프로젝트를 진행했습니다. '코로나에 뭐하지?'라는 서비스가 있다는 가정하에 사용자가 서비스를 이용하는 과정을 SQL문장 만들었습니다.

## SQL Data
 SQL 프로젝트를 진행하려면 데이터가 있어야 합니다. 재웅님이 코로나 관련 프로젝트를 진행하는 거니까 가상 데이터를 만들지 말고 실제로 있는 데이터를 사용해보는 것이 어떻겠냐고 제안하셔서 [공공데이터 포탈](https://www.data.go.kr/)을 사용하여 데이터를 수집했습니다. 데이터를 API를 통해 실시간으로 Json포맷을 받는 것은 테이블을 만들려는 저희의 의도와 맞지 않다고 판단해 데이터 파일을 다운받아 sql포맷으로 변환했습니다.

## 구조
![seoulcovid관계도](https://user-images.githubusercontent.com/53591258/100535690-82573500-325e-11eb-9535-fc8ba0805cd2.PNG)

## SQL Code
```sql
CREATE TABLE seoulpopulation (
인구 number (10),
구분 varchar2 (50) constraint seoulpopulation_구분_pk primary key,
일반가구수 number (10),
one number (10),
two number (10),
three number (10),
four number (10),
five number (10),
six number (10),
seven number (10),
평균가구원수 number (10, 2)
);
```
seoulpopulation table 만드는 코드입니다. table 구조는 공공데이터 구조를 기반으로 설계했습니다. seoulpopulation table은 각 구별 인구를 나타내는 table이기 때문에 구를 나타내는 구분을 primary key로 설정했습니다.

```sql
INSERT INTO seoulpopulation(인구,구분,일반가구수,one,two,three,four,five,six,seven,평균가구원수) VALUES (159842, '종로구',62652,24671,16208,11154,7828,2143,505,143,2.2);
```
seoulpopulation table INSERT 문장 예시입니다.

```sql
CREATE TABLE seoulcovid (
연번 INT primary key,
확진일 varchar2 (50) ,
환자번호 varchar2 (50) ,
국적 varchar2 (50) ,
환자정보 varchar2 (50) ,
지역 varchar2 (50) constraint seoulcovid_dept_fk references seoulpopulation(구분),
여행력 varchar2 (50) ,
접촉력 varchar2 (100) ,
조치사항 varchar2 (50) ,
상태 varchar2 (50) ,
이동경로 varchar2 (50) ,
등록일 varchar2 (50) ,
수정일 varchar2 (50) ,
노출여부 varchar2 (50)
);
```
seoulcovid table 만드는 코드입니다. table 구조는 공공데이터 기반으로 설계했습니다. seoulcovid table은 환자에 대한 정보를 나타내는 table입니다. 환자 번호를 primary key로 설정하고 싶었지만 공공데이터에 null값으로 저장되어 있어 연번을 primary key로 설정했습니다. 지역을 seloulpopulation(구분)에서 키를 받아오는 foreign key로 설정했습니다.

```sql
INSERT INTO seoulcovid(연번,확진일,환자번호,국적,환자정보,지역,여행력,접촉력,조치사항,상태,이동경로,등록일,수정일,노출여부) VALUES (7900,'11.24.',NULL,NULL,NULL,'강서구',NULL,'기타 확진자 접촉',NULL,NULL,NULL,'2020-11-25 10:18:53','2020-11-25 10:18:53','Y');
```
seoulcovid table INSERT 문장 예시입니다.

```sql
CREATE TABLE seoulhospital(
   개방자치단체코드  number (38)  NOT NULL,
   관리번호      varchar2 (100) constraint seoulhospital_관리번호_pk primary key,
   인허가일자     date  NOT NULL,
   인허가취소일자   varchar2 (100),\
   영업상태코드    number (38)  NOT NULL,
   영업상태명     varchar2 (100) NOT NULL,
   상세영업상태코드  number (38)  NOT NULL,
   상세영업상태명   varchar2 (100) NOT NULL,
   폐업일자      date,
   휴업시작일자    date,
   휴업종료일자    date,
   재개업일자     varchar2 (100),
   전화번호      varchar2 (100),
   소재지면적     varchar2 (100),
   소재지우편번호   number (38),
   지번주소      varchar2 (110),
   도로명주소     varchar2 (156),
   도로명우편번호   number (38),
   사업장명      varchar2 (100) NOT NULL,
   최종수정일자    number (38)  NOT NULL,
   데이터갱신구분   varchar2 (100) NOT NULL,
   데이터갱신일자   varchar2 (100) NOT NULL,
   업태구분명     varchar2 (100) NOT NULL,
   좌표정보X     number (38,22),
   좌표정보Y     number (38,22),
   의료기관종별명   varchar2 (100),
   의료인수      number (38),
   입원실수      number (38),
   병상수       number (38),
   총면적       number (18,4),
   진료과목내용    varchar2 (300),
   진료과목내용명   varchar2 (400),
   지정취소일자    varchar2 (60),
   완화의료지정형태  varchar2 (100),
   완화의료담당부서명 varchar2 (100),
   구급차특수     number (38),
   구급차일반     number (38),
   총인원       varchar2 (100),
   구조사수      varchar2 (100),
   허가병상수     number (38),
   최초지정일자    varchar2 (100)
);
```
seoulhospital table 만드는 코드입니다. table 구조는 공공데이터 기반으로 설계했습니다. 각 병원을 나타내는 관리번호를 primary key로 설정했습니다. 그리고 반드시 있어야 하는 데이터들을 NOT NULL로 제약조건을 명시했습니다.
```sql
INSERT INTO seoulhospital(개방자치단체코드,관리번호,인허가일자,인허가취소일자,영업상태코드,영업상태명,상세영업상태코드,상세영업상태명,폐업일자,휴업시작일자,휴업종료일자,재개업일자,전화번호,소재지면적,소재지우편번호,지번주소,도로명주소,도로명우편번호,사업장명,최종수정일자,데이터갱신구분,데이터갱신일자,업태구분명,좌표정보X,좌표정보Y,의료기관종별명,의료인수,입원실수,병상수,총면적,진료과목내용,진료과목내용명,지정취소일자,완화의료지정형태,완화의료담당부서명,구급차특수,구급차일반,총인원,구조사수,허가병상수,최초지정일자) VALUES (3000000,'PHMA220083000034021200001','20080624',NULL,03,'폐업',03,'폐업','20181001',NULL,NULL,NULL,'02-766-2004',NULL,110808,'서울특별시 종로구 돈의동 78번지','서울특별시 종로구 돈화문로9길 26 (돈의동)',03139,'춘원당한방병원',20181001134047,'U','2018-10-03 02:35:18.0','한방병원',199079.009091626,452168.088676879,'한방병원',8,7,31,2182.81,'301 303 304 305 306 307 308 302','한방부인과 침구과 사상체질과 한방재활의학과 한방신경정신과 한방안?이비인후?피부과 한방소아과 한방내과',NULL,NULL,NULL,0,0,NULL,NULL,0,NULL);
```
seoulhospital table INSERT 문장 예시입니다.

```sql
CREATE TABLE seoulrestaurant(
   개방자치단체코드  number (38)
  ,관리번호      varchar2 (100) primary key
  ,인허가일자     number (38)  NOT NULL
  ,인허가취소일자   varchar2 (100)
  ,영업상태코드    number (38)  NOT NULL
  ,영업상태명     varchar2 (100) NOT NULL
  ,상세영업상태코드  number (38)  NOT NULL
  ,상세영업상태명   varchar2 (100) NOT NULL
  ,폐업일자      varchar2 (100)
  ,휴업시작일자    varchar2 (100)
  ,휴업종료일자    varchar2 (100)
  ,재개업일자     varchar2 (100)
  ,전화번호      varchar2 (100)
  ,소재지면적     NUMERIC(8,2)
  ,소재지우편번호   number (38) 
  ,지번주소      varchar2 (200)
  ,도로명주소     varchar2 (200)
  ,도로명우편번호   number (38) 
  ,사업장명      varchar2 (100) NOT NULL
  ,최종수정일자    number (38)  NOT NULL
  ,데이터갱신구분   varchar2 (100) NOT NULL
  ,데이터갱신일자   varchar2 (100) NOT NULL
  ,업태구분명     varchar2 (100)
  ,좌표정보X     NUMERIC(20,11)
  ,좌표정보Y     NUMERIC(20,11)
  ,위생업태명     varchar2 (100)
  ,남성종사자수    number (38) 
  ,여성종사자수    number (38) 
  ,영업장주변구분명  varchar2 (100)
  ,등급구분명     varchar2 (100)
  ,급수시설구분명   varchar2 (100)
  ,총인원       varchar2 (100)
  ,본사종업원수    number (38) 
  ,공장사무직종업원수 number (38) 
  ,공장판매직종업원수 number (38) 
  ,공장생산직종업원수 number (38) 
  ,건물소유구분명   varchar2 (100)
  ,보증액       number (38) 
  ,월세액       number (38) 
  ,다중이용업소여부  varchar2 (100)
  ,시설총규모     NUMERIC(8,2)
  ,전통업소지정번호  varchar2 (100)
  ,전통업소주된음식  varchar2 (100)
  ,홈페이지      varchar2 (100)
);
```
seoulrestaurant table 만드는 코드입니다. 테이블 구조는 공공데이터 기반으로 설계했습니다. 관리번호를 primary key로 설정하고 반드시 존재해야 하는 데이터는 NOT NULL로 명시했습니다.
```sql
INSERT INTO seoulrestaurant(개방자치단체코드,관리번호,인허가일자,인허가취소일자,영업상태코드,영업상태명,상세영업상태코드,상세영업상태명,폐업일자,휴업시작일자,휴업종료일자,재개업일자,전화번호,소재지면적,소재지우편번호,지번주소,도로명주소,도로명우편번호,사업장명,최종수정일자,데이터갱신구분,데이터갱신일자,업태구분명,좌표정보X,좌표정보Y,위생업태명,남성종사자수,여성종사자수,영업장주변구분명,등급구분명,급수시설구분명,총인원,본사종업원수,공장사무직종업원수,공장판매직종업원수,공장생산직종업원수,건물소유구분명,보증액,월세액,다중이용업소여부,시설총규모,전통업소지정번호,전통업소주된음식,홈페이지) VALUES (3000000,'3000000-101-2001-11784',20010214,NULL,01,'영업/정상',01,'영업',NULL,NULL,NULL,NULL,'02 7372230',NULL,110061,'서울특별시 종로구 신문로1가 166-2번지',NULL,NULL,'일식동경',20090102100019,'I','2018-08-31 23:59:59.0','일식',NULL,NULL,'일식',0,0,'기타','우수',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'N',34.56,NULL,NULL,NULL);
```
seoulrestaurant table INSERT 문장 예시입니다.

## 가상 시나리오
- 이사를 계획하는 A씨  
 1. 이번에 코로나에서 가장 안전한 구에 방을 구해보고자 한다. 정확한 방법이란 없지만, 가장 확진자 수가 적은 구를 선택해보고자 한다. 어떤 지역을 고르는 것이 좋을까?  
 2. 전체를 보니까 잘 모르겠는 A씨. 최근 10일간 가장 조금 늘어난 지역을 알고싶다.  
 3. 금천구로 결정한 A씨. 이사를 가려는 지역 안에 어떤 병원이 있는지 알고싶다. 

- 서초구에 출근하는 B씨. 서초구는 다른 구에 비해 안전한지 확인해 보고 싶어졌다.  
 4. 서초구의 확진자 수 확인  
 5. 10만명당 확진자수 순서 확인  
 6. 직장인 서초구에서 밥을 먹으려는 B씨. 서초구에서 확진 관련 접촉 지역을 확인해보고자 한다.  

- 한 의사 C씨는 이번 코로나 사태 관련 파악이 하고 싶어져 몇가지 간단한 계산을 해보고 싶어졌다.  
 7. 서울시에서 가구별 가구원수가 감염에 의미가 있나?  
 8. 퇴원하지 않은 환자가 제일 많은 구에 가서 주말에 손을 더하고자 한다. 어디로 가면 좋을까?  
 9. 병원 수에 비해 퇴원하지 않은 환자가 제일 많은 구에 가서 주말에 손을 더하고자 한다. 어디로 가면 좋을까?  

- 코로나지만 식당에 가고싶은 D씨.  
 10. 가고자 하는 식당의 지역에 확진자가 어느정도 있는지 알고싶다.  
 11. 혹시나 해서 갔던 식당(먹거리 곱창전골)이 확진자가 나왔던 곳인지 알고싶은 D씨.  


## 답
```sql
1. select * 
   from (select 지역, count(*) 
         from seoulcovid 
         group by 지역 
         order by count(*) asc) 
   where rownum=1;
   
2. select * 
   from (select 지역, count(*) as co 
         from seoulcovid 
         where 확진일 between sysdate - 10 and sysdate 
         group by 지역) 
   order by co asc;
   
3. select 사업장명, 진료과목내용명 
   from seoulhospital 
   where 도로명주소 like '%금천구%';
   
4. select count(*) 
   from seoulcovid 
   where 지역='서초구';
   
5. select c.지역, co/인구*100000 , 평균가구원수, one/인구*100000
   from (select 지역, count(연번) as co 
         from seoulcovid 
         group by 지역 
         order by count(*) asc) c, seoulpopulation p 
   where c.지역=p.구분 
   order by co/인구*100000 asc;
   
6. select distinct 접촉력 
   from seoulcovid
   where 접촉력 like '%서초구%';
   
7. select c.지역, co/인구*100000 , 평균가구원수, one/인구*100000
   from (select 지역, count(연번) as co 
         from seoulcovid 
	 group by 지역 
	 order by count(*) asc) c, seoulpopulation p 
   where c.지역=p.구분 
   order by co/인구*100000 asc;
   
8. select 지역, count(*) 
   from seoulcovid 
   where 상태!='퇴원' 
   group by 지역 
   order by count(*) asc;
   
9. select 구분, fatality
   from(select s.구분, cnumber/mnumber*100 as fatality
        from(select 구분, count(관리번호) as mnumber
	     from seoulpopulation p, seoulhospital h
             where trim(substr(도로명주소,instr(도로명주소, ' ', 1, 1),instr(도로명주소, ' ', 1, 2)-instr(도로명주소, ' ', 1, 1)))=구분
             group by 구분) s,
	     (select 지역, count(*) as cnumber
             from seoulcovid
             where 상태!='퇴원'
             group by 지역) c
        where s.구분=c.지역
        order by cnumber/mnumber*100 desc)
    where rownum=1;

10. select count(*), substr(지번주소,instr(지번주소, ' ', 1, 1),instr(지번주소, ' ', 1, 2)-instr(지번주소, ' ', 1, 1)) as 구
    from seoulcovid c, 
        (select 지번주소 from seoulrestaurant where 사업장명='일식동경') r
         where trim(substr(지번주소,instr(지번주소, ' ', 1, 1),instr(지번주소, ' ', 1, 2)-instr(지번주소, ' ', 1, 1)))=지역
    group by r.지번주소;

11. select h.도로명주소, 사업장명
    from seoulhospital h, 
        (select 지역
         from seoulcovid
         where 접촉력 like '%먹거리 곱창전골%') c
    where trim(substr(h.도로명주소,instr(h.도로명주소, ' ', 1, 1),instr(h.도로명주소, ' ', 1, 2)-instr(h.도로명주소, ' ', 1, 1)))=c.지역;
    
```

## 프로젝트 진행하면서 힘들었던 점
 기존에 있던 파일을 SQL파일로 변환하면서 호환성 문제가 힘들었으며  기존에 있던 데이터는 이미 정리된 데이터여서 좀 더 자유롭게 활용할 방법이 제한되었습니다. 그래서 다음 프로젝트에선 좀 더 자유롭게 생각할 수 있는 방법을 찾아보려고 합니다. 마지막으로 가상 시나리오 9번의 SQL문장을 구현하는데 어려움이 있었습니다. 혼자서 생각했으면 못 했을 부분을 Pair programming을 통해 서로 부족한 부분을 채워 어려움을 해결해 SQL문장을 구현했습니다.
 
 ---
 
# [SQL-Mini-Project-Seoul-Covid](https://github.com/chawanghyeon/SQL-Mini-Project-Seoul-Covid)

## Project Topic Selection Process
 ChaWanghyeon and KimJaeung, team Wangjae decided to proceed with a SQL project. In the process of selecting the project topic, I suggested that the Corona virus is serious these days, so why don't we proceed with the project on the Covid19 theme? Jaeung is also interested in covid19, so we proceeded with the project on the Covid19 theme. We created an SQL statement about how users use the service, assuming there is a service called 'What do we do with Corona?'

## SQL Data
 We must have data to proceed with the SQL project. Jae-woong suggested that we use real data instead of creating virtual data because we're working on a corona project, so we collected data using public data. I downloaded the data file and converted it to SQL format because I thought that receiving Json format in real time through API was not in line with our intention to create a table.

## Structure
![seoulcovid관계도](https://user-images.githubusercontent.com/53591258/100535690-82573500-325e-11eb-9535-fc8ba0805cd2.PNG)

## SQL Code
```sql
CREATE TABLE seoulpopulation (
인구 number (10),
구분 varchar2 (50) constraint seoulpopulation_구분_pk primary key,
일반가구수 number (10),
one number (10),
two number (10),
three number (10),
four number (10),
five number (10),
six number (10),
seven number (10),
평균가구원수 number (10, 2)
);
```
seoulpopulation table Code that makes table. Table structure is designed based on public data structure. Because the seoulpopulation table is a table representing each distinct population, the division representing the 구분 is set to the primary key.

```sql
INSERT INTO seoulpopulation(인구,구분,일반가구수,one,two,three,four,five,six,seven,평균가구원수) VALUES (159842, '종로구',62652,24671,16208,11154,7828,2143,505,143,2.2);
```
seoulpopulation table INSERT example.

```sql
CREATE TABLE seoulcovid (
연번 INT primary key,
확진일 varchar2 (50) ,
환자번호 varchar2 (50) ,
국적 varchar2 (50) ,
환자정보 varchar2 (50) ,
지역 varchar2 (50) constraint seoulcovid_dept_fk references seoulpopulation(구분),
여행력 varchar2 (50) ,
접촉력 varchar2 (100) ,
조치사항 varchar2 (50) ,
상태 varchar2 (50) ,
이동경로 varchar2 (50) ,
등록일 varchar2 (50) ,
수정일 varchar2 (50) ,
노출여부 varchar2 (50)
);
```
seoulcovid table Code that makes table. Table structure is designed based on public data structure. seoulcovid table is a table that representing imformation of patient. We set the region to a foreign key that receives keys from seoulpopulation(구분).

```sql
INSERT INTO seoulcovid(연번,확진일,환자번호,국적,환자정보,지역,여행력,접촉력,조치사항,상태,이동경로,등록일,수정일,노출여부) VALUES (7900,'11.24.',NULL,NULL,NULL,'강서구',NULL,'기타 확진자 접촉',NULL,NULL,NULL,'2020-11-25 10:18:53','2020-11-25 10:18:53','Y');
```
seoulcovid table INSERT example

```sql
CREATE TABLE seoulhospital(
   개방자치단체코드  number (38)  NOT NULL,
   관리번호      varchar2 (100) constraint seoulhospital_관리번호_pk primary key,
   인허가일자     date  NOT NULL,
   인허가취소일자   varchar2 (100),\
   영업상태코드    number (38)  NOT NULL,
   영업상태명     varchar2 (100) NOT NULL,
   상세영업상태코드  number (38)  NOT NULL,
   상세영업상태명   varchar2 (100) NOT NULL,
   폐업일자      date,
   휴업시작일자    date,
   휴업종료일자    date,
   재개업일자     varchar2 (100),
   전화번호      varchar2 (100),
   소재지면적     varchar2 (100),
   소재지우편번호   number (38),
   지번주소      varchar2 (110),
   도로명주소     varchar2 (156),
   도로명우편번호   number (38),
   사업장명      varchar2 (100) NOT NULL,
   최종수정일자    number (38)  NOT NULL,
   데이터갱신구분   varchar2 (100) NOT NULL,
   데이터갱신일자   varchar2 (100) NOT NULL,
   업태구분명     varchar2 (100) NOT NULL,
   좌표정보X     number (38,22),
   좌표정보Y     number (38,22),
   의료기관종별명   varchar2 (100),
   의료인수      number (38),
   입원실수      number (38),
   병상수       number (38),
   총면적       number (18,4),
   진료과목내용    varchar2 (300),
   진료과목내용명   varchar2 (400),
   지정취소일자    varchar2 (60),
   완화의료지정형태  varchar2 (100),
   완화의료담당부서명 varchar2 (100),
   구급차특수     number (38),
   구급차일반     number (38),
   총인원       varchar2 (100),
   구조사수      varchar2 (100),
   허가병상수     number (38),
   최초지정일자    varchar2 (100)
);
```
seoulhospital table Code that makes table. Table structure is designed based on public data structure. We set The management number representing each hospital to the primary key. 
```sql
INSERT INTO seoulhospital(개방자치단체코드,관리번호,인허가일자,인허가취소일자,영업상태코드,영업상태명,상세영업상태코드,상세영업상태명,폐업일자,휴업시작일자,휴업종료일자,재개업일자,전화번호,소재지면적,소재지우편번호,지번주소,도로명주소,도로명우편번호,사업장명,최종수정일자,데이터갱신구분,데이터갱신일자,업태구분명,좌표정보X,좌표정보Y,의료기관종별명,의료인수,입원실수,병상수,총면적,진료과목내용,진료과목내용명,지정취소일자,완화의료지정형태,완화의료담당부서명,구급차특수,구급차일반,총인원,구조사수,허가병상수,최초지정일자) VALUES (3000000,'PHMA220083000034021200001','20080624',NULL,03,'폐업',03,'폐업','20181001',NULL,NULL,NULL,'02-766-2004',NULL,110808,'서울특별시 종로구 돈의동 78번지','서울특별시 종로구 돈화문로9길 26 (돈의동)',03139,'춘원당한방병원',20181001134047,'U','2018-10-03 02:35:18.0','한방병원',199079.009091626,452168.088676879,'한방병원',8,7,31,2182.81,'301 303 304 305 306 307 308 302','한방부인과 침구과 사상체질과 한방재활의학과 한방신경정신과 한방안?이비인후?피부과 한방소아과 한방내과',NULL,NULL,NULL,0,0,NULL,NULL,0,NULL);
```
seoulhospital table INSERT example

```sql
CREATE TABLE seoulrestaurant(
   개방자치단체코드  number (38)
  ,관리번호      varchar2 (100) primary key
  ,인허가일자     number (38)  NOT NULL
  ,인허가취소일자   varchar2 (100)
  ,영업상태코드    number (38)  NOT NULL
  ,영업상태명     varchar2 (100) NOT NULL
  ,상세영업상태코드  number (38)  NOT NULL
  ,상세영업상태명   varchar2 (100) NOT NULL
  ,폐업일자      varchar2 (100)
  ,휴업시작일자    varchar2 (100)
  ,휴업종료일자    varchar2 (100)
  ,재개업일자     varchar2 (100)
  ,전화번호      varchar2 (100)
  ,소재지면적     NUMERIC(8,2)
  ,소재지우편번호   number (38) 
  ,지번주소      varchar2 (200)
  ,도로명주소     varchar2 (200)
  ,도로명우편번호   number (38) 
  ,사업장명      varchar2 (100) NOT NULL
  ,최종수정일자    number (38)  NOT NULL
  ,데이터갱신구분   varchar2 (100) NOT NULL
  ,데이터갱신일자   varchar2 (100) NOT NULL
  ,업태구분명     varchar2 (100)
  ,좌표정보X     NUMERIC(20,11)
  ,좌표정보Y     NUMERIC(20,11)
  ,위생업태명     varchar2 (100)
  ,남성종사자수    number (38) 
  ,여성종사자수    number (38) 
  ,영업장주변구분명  varchar2 (100)
  ,등급구분명     varchar2 (100)
  ,급수시설구분명   varchar2 (100)
  ,총인원       varchar2 (100)
  ,본사종업원수    number (38) 
  ,공장사무직종업원수 number (38) 
  ,공장판매직종업원수 number (38) 
  ,공장생산직종업원수 number (38) 
  ,건물소유구분명   varchar2 (100)
  ,보증액       number (38) 
  ,월세액       number (38) 
  ,다중이용업소여부  varchar2 (100)
  ,시설총규모     NUMERIC(8,2)
  ,전통업소지정번호  varchar2 (100)
  ,전통업소주된음식  varchar2 (100)
  ,홈페이지      varchar2 (100)
);
```
seoulrestaurant table Code that makes table. Table structure is designed based on public data structure. We set The management number to the primary key. 
```sql
INSERT INTO seoulrestaurant(개방자치단체코드,관리번호,인허가일자,인허가취소일자,영업상태코드,영업상태명,상세영업상태코드,상세영업상태명,폐업일자,휴업시작일자,휴업종료일자,재개업일자,전화번호,소재지면적,소재지우편번호,지번주소,도로명주소,도로명우편번호,사업장명,최종수정일자,데이터갱신구분,데이터갱신일자,업태구분명,좌표정보X,좌표정보Y,위생업태명,남성종사자수,여성종사자수,영업장주변구분명,등급구분명,급수시설구분명,총인원,본사종업원수,공장사무직종업원수,공장판매직종업원수,공장생산직종업원수,건물소유구분명,보증액,월세액,다중이용업소여부,시설총규모,전통업소지정번호,전통업소주된음식,홈페이지) VALUES (3000000,'3000000-101-2001-11784',20010214,NULL,01,'영업/정상',01,'영업',NULL,NULL,NULL,NULL,'02 7372230',NULL,110061,'서울특별시 종로구 신문로1가 166-2번지',NULL,NULL,'일식동경',20090102100019,'I','2018-08-31 23:59:59.0','일식',NULL,NULL,'일식',0,0,'기타','우수',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'N',34.56,NULL,NULL,NULL);
```
seoulrestaurant table INSERT example

## Virtual scenario
- Mr. A planning to move.
1. I'm looking for a room in the safest district in Corona this time. There is no exact method, but I would like to choose the district with the least confirmed number of people. Which area would be better to choose?
2. I can't tell from looking at the whole thing. I would like to know the area that has increased the least in the last 10 days.
3. Mr. A decided in Geumcheon-gu. I want to know what kind of hospital is in the area where I want to move.

- Mr. B going to Seocho-gu. I want to check if it is safer than other districts.
4. Confirmation of the number of confirmed cases in Seocho-gu
5. Check the sequence of confirmed numerals per 100,000 people
6. Mr. B, who is going to eat in Seocho-gu, office worker, would like to check the area of contact regarding confirmed diagnosis in Seocho-gu.

- One doctor, C, wanted to figure out what was going on in Corona, so he wanted to do some simple calculations.
7. Is the number of households in Seoul meaningful for infection?
8. I'd like to go to the district with the largest number of patients who haven't been discharged and add some extra hands over the weekend. Where should I go?
9. I would like to go to the district with the largest number of patients who have not been discharged compared to the number of hospitals and add more hands over the weekend. Where should I go?

- Mr. D, who wants to go to Corona but a restaurant.
10. I'd like to know how many confirmed people are in the area of the restaurant I'd like to.
11. Mr. D wants to know if the restaurant (gopchang jeongol) that he went to was confirmed.  


## Answer
```sql
1. select * 
   from (select 지역, count(*) 
         from seoulcovid 
         group by 지역 
         order by count(*) asc) 
   where rownum=1;
   
2. select * 
   from (select 지역, count(*) as co 
         from seoulcovid 
         where 확진일 between sysdate - 10 and sysdate 
         group by 지역) 
   order by co asc;
   
3. select 사업장명, 진료과목내용명 
   from seoulhospital 
   where 도로명주소 like '%금천구%';
   
4. select count(*) 
   from seoulcovid 
   where 지역='서초구';
   
5. select c.지역, co/인구*100000 , 평균가구원수, one/인구*100000
   from (select 지역, count(연번) as co 
         from seoulcovid 
         group by 지역 
         order by count(*) asc) c, seoulpopulation p 
   where c.지역=p.구분 
   order by co/인구*100000 asc;
   
6. select distinct 접촉력 
   from seoulcovid
   where 접촉력 like '%서초구%';
   
7. select c.지역, co/인구*100000 , 평균가구원수, one/인구*100000
   from (select 지역, count(연번) as co 
         from seoulcovid 
	 group by 지역 
	 order by count(*) asc) c, seoulpopulation p 
   where c.지역=p.구분 
   order by co/인구*100000 asc;
   
8. select 지역, count(*) 
   from seoulcovid 
   where 상태!='퇴원' 
   group by 지역 
   order by count(*) asc;
   
9. select 구분, fatality
   from(select s.구분, cnumber/mnumber*100 as fatality
        from(select 구분, count(관리번호) as mnumber
	     from seoulpopulation p, seoulhospital h
             where trim(substr(도로명주소,instr(도로명주소, ' ', 1, 1),instr(도로명주소, ' ', 1, 2)-instr(도로명주소, ' ', 1, 1)))=구분
             group by 구분) s,
	     (select 지역, count(*) as cnumber
             from seoulcovid
             where 상태!='퇴원'
             group by 지역) c
        where s.구분=c.지역
        order by cnumber/mnumber*100 desc)
    where rownum=1;

10. select count(*), substr(지번주소,instr(지번주소, ' ', 1, 1),instr(지번주소, ' ', 1, 2)-instr(지번주소, ' ', 1, 1)) as 구
    from seoulcovid c, 
        (select 지번주소 from seoulrestaurant where 사업장명='일식동경') r
         where trim(substr(지번주소,instr(지번주소, ' ', 1, 1),instr(지번주소, ' ', 1, 2)-instr(지번주소, ' ', 1, 1)))=지역
    group by r.지번주소;

11. select h.도로명주소, 사업장명
    from seoulhospital h, 
        (select 지역
         from seoulcovid
         where 접촉력 like '%먹거리 곱창전골%') c
    where trim(substr(h.도로명주소,instr(h.도로명주소, ' ', 1, 1),instr(h.도로명주소, ' ', 1, 2)-instr(h.도로명주소, ' ', 1, 1)))=c.지역;
    
```

## The hard part
 The conversion of existing files to SQL files made compatibility difficult, and the existing data was already organized, limiting how to use it more freely. So in the next project, I'm going to look for ways to think more freely. Finally, it was difficult to implement the SQL statement in virtual scenario number 9. We implemented SQL sentences by solving each other's shortcomings through pair programming.
