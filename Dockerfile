FROM php:8.2-apache

RUN docker-php-ext-install pdo pdo_mysql

COPY . /var/www/html/

RUN a2enmod rewrite

ENV APACHE_RUN_USER www-data
ENV APACHE_RUN_GROUP www-data

COPY apache.conf /etc/apache2/sites-enabled/000-default.conf

CMD ["apache2-foreground"]
