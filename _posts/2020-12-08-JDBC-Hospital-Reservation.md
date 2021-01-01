---
title: 'JDBC-Hospital-Reservation'
date: 2020-12-08
draft: false
description: 'JDBC-Hospital-Reservation'
tags: [JDBC-Hospital-Reservation]
categories: [projects]
---

# [JDBC-Hospital-Reservation](https://github.com/chawanghyeon/JDBC-Hospital-Reservation)

- 프로젝트 주제

    ### 병원 예약 시스템

- 주제 정하는 과정

    JDBC 구조와 복습에 초점을 더 맞췄고 의료계에서 사용되는 실사용 데이터 구조를 가지고 왔다.

<details>
<summary>프로젝트 설계</summary>
<div markdown="1">

주제 : 병원 예약 시스템

1. MVC + DAO + DTO 적용

    ![DI](https://user-images.githubusercontent.com/53591258/103432830-be98ff00-4c29-11eb-8400-19a94d447b53.jpg)

    ![JDBC_SQL_DB](https://user-images.githubusercontent.com/53591258/103432835-ed16da00-4c29-11eb-9fe0-489915c6e209.jpg)


2. 사용하는 테이블 : 성형외과병원 테이블, 의료진 정보 테이블, 환자정보 테이블,  진단명 테이블 
3. 서비스 로직
    1. 모든 환자 검색
    2. 환자 예약번호로 하나의 환자정보만 검색(진료과 정보 포함)
    3. 저장
    4. 수정
    5. 삭제
4. 클래스 설계
CustodianDTO.java - 의료기관, 의료진 정보 설정 (진료과번호코드,진료과명)
CustodianDAO.java
InformationRecipientDTO.java - 의뢰 및 예약 대상 의료기관 정보
InformationRecipientDAO.java
ProblemDTO.java - 진단내역 설정
ProblemDAO.java -
PatientDTO.java - 환자정보 설정(진료예약시간)
PatientDAO.java 
StartView.java
EndView.java
Controller.java, service
</div>
</details>

<details>
<summary>프로젝트 시나리오</summary>
<div markdown="1">

환자가 병원과 의사를 검색 및 예약하고 환자ID정보 확인 뒤 진단 내역 출력 되어 다음 병원 후 연계까지 기획 

1. 환자 ID로 검색
2. 모든 의료기관 검색
3. 모든 의사 검색
4. 특정 의사 선택해서 예약
5. 환자 ID로 예약  정보 확인
6. 진단 내역 출력
</div>
</details>

<details>
<summary>프로젝트 로드맵</summary>
<div markdown="1">

![image](https://user-images.githubusercontent.com/53591258/103432879-775f3e00-4c2a-11eb-8a3b-f571c05dfe8c.png)
</div>
</details>

<details>
<summary>로그 데이터</summary>
<div markdown="1">

1. 로그 데이터 사진

![Untitled](https://user-images.githubusercontent.com/53591258/103432913-1dab4380-4c2b-11eb-9e07-9af6c18e128c.png)

2. 병원 예약 시스템의 로그를 데이터로 남기면 다음과 같은 정보를 알 수 있습니다.
    1. 어떤 병원을 많이 가는지
    2. 어떤 의사를 많이 선택하는지
    3. 어떤 진료 목적으로 병원에 왔는지
    4. 환자들이 어떤 시간대를 선호하는지
    5. 어떤 지역 사람들이 많이 오는지
    6. 등등
</div>
</details>

<details>
<summary>Happening</summary>
<div markdown="1">

# Happening

- 기존 데이터에서 우리 팀 프로젝트에 필요한 데이터로 변경 및 테이블 간 관계 구조 변경
    - primary key 설정 및 각 데이터table에서의 고유 값의 중요성을 알게 되었음.

    (다 같이)

- SQL 입력문 만들 때 스프레드시트의 함수를 사용하면 금방 만들 수 있음.

    (민영)

- 자바 개발 환경이 달라 호환성 문제가 있었습니다.

    (왕현, 민영, 종욱)

    - DAO 를 만들고 import를 하려고 하면 the resource is not on the build path of a Java project.  라는 에러 메세지가 뜬다.
        - 자바 버전을 맞추어서 해결하였습니다.
- JDBC드라이버 문제가 발생했었습니다. 자바 경로에 드라이버를 복사해 해결했습니다.

    (민영, 종욱)

- git Happening
    - 동시에 같은 클래스를 수정하고 git pull을 하니 conflict이 일어나 강제로 pull을 했습니다. 다음부터는 개발할 코드를 클래스 별로 확실하게 나눠서 해야겠다고 느꼈습니다.

        (왕현, 종욱)

    - master branch를 main으로 merge하는 과정에서 문제가 생겼습니다.

        git branch -M main 

        git push origin main 했는데 또 문제가 생겼습니다.  

        그래서 git push origin main --force를 했습니다.

        (왕현, 종욱)

        그 이후에는 git push origin main만 해도 잘 푸쉬가 되었습니다.

    - git pull을 하는데 The following untracked working tree files would be overwritten by merge:라는 오류가 생겼습니다. 원격 저장소에 있는 파일을 로컬에서 tracking 하지 않아서 오류가 발생했습니다.

        강제로 merge했는데 conflict에러가 발생했습니다. 이 conflict 에러는

        git fetch —all

        git reset —hard origin/main

        git pull origin main로 해결했습니다.

        ![___](https://user-images.githubusercontent.com/53591258/103432924-5a773a80-4c2b-11eb-862e-771f8be6e611.png)

        (왕현, 종욱)

- 마지막으로 화면을 공유해서 다같이 코드리뷰를 진행했습니다.

    (다 같이)
</div>
</details>
